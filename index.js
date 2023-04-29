const {
  findUserByUsername,
  findUserBySessionId,
  createSession,
  deleteSession
} = require('./methods/session.js');
const {
  createTimer,
  stopTimer,
  getAllTimers
} = require('./methods/timers.js');
const {
  postMessage,
  sendAllTimers,
  sendActiveTimersToAllClients
} = require('./methods/ws.js');

const express = require("express");
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require("body-parser");
const cookie = require('cookie');
const cookieParser = require("cookie-parser");
const nunjucks = require("nunjucks");
const { nanoid } = require("nanoid");
const crypto = require("crypto");

const app = express();

const knex = require('knex')({
  client: "sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: './data/db.sqlite3'
  },
});

nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

app.set("view engine", "njk");

app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

const server = http.createServer(app);
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
const clients = new Map();

server.on('upgrade', async (req, socket, head) => {
  const cookies = cookie.parse(req.headers['cookie']);
  const sessionId = cookies && cookies['sessionId'];
  const user = await findUserBySessionId(sessionId);

  if (!user) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  req.user = user;
  req.sessionId = sessionId;
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

wss.on('connection', async(ws, req) => {
  clients.set(ws);
  ws.on('message', async (message) => {
    const data = postMessage(message);

    if (data.type === 'all_timers') {
      const { activeTimers, oldTimers } = await getAllTimers(req);
      sendAllTimers(ws, activeTimers, oldTimers);
    }

    if (data.type === 'create_timer') {
      const { id } = await createTimer(req, data);
      const { activeTimers, oldTimers } = await getAllTimers(req);
      ws.send(
        JSON.stringify({
          type: 'create_timer',
          timerId: id
        })
      )
      sendAllTimers(ws, activeTimers, oldTimers);
    }

    if (data.type === 'stop_timer') {
      const { id } = await stopTimer(data);
      const { activeTimers, oldTimers } = await getAllTimers(req);
      ws.send(
        JSON.stringify({
          type: 'stop_timer',
          timerId: id
        })
      )
      sendAllTimers(ws, activeTimers, oldTimers);
    }
  })

  setInterval(async () => {
    const { activeTimers } = await getAllTimers(req);
    await sendActiveTimersToAllClients(ws, activeTimers, clients);
  }, 1000)
})

const createHash = (password) => {
  const hash = crypto.createHash("sha256");
  return hash.update(password).digest("hex");
}

const auth = () => async (req, res, next) => {
  if (!req.cookies['sessionId'])
    return next();

  const user = await findUserBySessionId(req.cookies['sessionId']);
  req.user = user;
  req.sessionId = req.cookies["sessionId"];
  next();
}

app.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
    signupSuccess: req.query.signupSuccess === "true" ? "Account created" : req.query.signupSuccess,
    signupError: req.query.signupError === "true" ? "Such user already exists" : req.query.signupError,
  });
});

app.post("/login", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  const user = await findUserByUsername(username);

  if (!user || user.password !== createHash(password))
    return res.redirect("/?authError=true");

  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, { httpOnly: true }).redirect('/');
});

app.get("/logout", auth(), async (req, res) => {
  if (!req.user)
    return res.redirect("/");

  await deleteSession(req.sessionId);
  res.clearCookie("sessionId").redirect("/");
});

app.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;

  if (username.length === 0 || password.length === 0)
    return res.redirect("/?signupError=Fill up all fields");

  if ((await findUserByUsername(username)) && username === (await findUserByUsername(username)).username)
    return res.redirect("/?signupError=true");

  await knex('users').insert({
      id: nanoid(),
      username: username,
      password: createHash(password)
    })

  return res.redirect("/?signupSuccess=true");
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});

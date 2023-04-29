/*global UIkit, Vue */

(() => {
  const notification = (config) =>
    UIkit.notification({
      pos: "top-right",
      timeout: 5000,
      ...config,
    });

  const info = (message) =>
    notification({
      message,
      status: "success",
    });

  const postMessage = (message) => {
    try {
      return JSON.parse(message.data);
    } catch (err) {
      return;
    }
  }

  new Vue({
    el: "#app",
    data: {
      client: null,
      desc: "",
      description: "",
      activeTimers: [],
      oldTimers: [],
    },
    methods: {
      createTimer() {
        this.description = this.desc;
        this.desc = "";
        this.client.send(
          JSON.stringify({
            type: 'create_timer',
            description: this.description
          })
        )
      },
      stopTimer(id) {
        this.client.send(
          JSON.stringify({
            type: 'stop_timer',
            timerId: id
          })
        )
      },
      formatTime(ts) {
        return new Date(ts).toTimeString().split(" ")[0];
      },
      formatDuration(d) {
        d = Math.floor(d / 1000);
        const s = d % 60;
        d = Math.floor(d / 60);
        const m = d % 60;
        const h = Math.floor(d / 60);
        return [h > 0 ? h : null, m, s]
          .filter((x) => x !== null)
          .map((x) => (x < 10 ? "0" : "") + x)
          .join(":");
      },
    },
    created() {
      const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      this.client = new WebSocket(`${wsProto}//${location.host}`);

      this.client.addEventListener('open', () => {
        this.client.send(
          JSON.stringify({
            type: 'all_timers'
          })
        )
      })

      this.client.addEventListener('message', (message) => {
        const data = postMessage(message);

        if (data.type === 'all_timers') {
          this.activeTimers = data.activeTimers;
          this.oldTimers = data.oldTimers;
        }

        if (data.type === 'active_timers') {
          this.activeTimers = data.activeTimers;
        }

        if (data.type === 'create_timer') {
          this.activeTimers = data.activeTimers;
          this.oldTimers = data.oldTimers;
          info(`Created new timer "${this.description}" [${data.timerId}]`);
        }

        if (data.type === 'stop_timer') {
          this.activeTimers = data.activeTimers;
          this.oldTimers = data.oldTimers;
          info(`Stopped the timer [${data.timerId}]`);
        }
      })
    },
  });
})();

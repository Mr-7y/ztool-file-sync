// Event dispatcher for file-share plugin
const listeners = {};

const EventDispatcher = {
  registryEventListener(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
      const idx = (listeners[event] || []).indexOf(callback);
      if (idx >= 0) listeners[event].splice(idx, 1);
    };
  },
  dispatchEvent(event, data) {
    (listeners[event] || []).forEach((cb) => {
      try { cb(data); } catch (e) { console.error("EventDispatcher error:", e); }
    });
  },
  removeEventListener(event, callback) {
    if (!callback) {
      delete listeners[event];
    } else {
      const idx = (listeners[event] || []).indexOf(callback);
      if (idx >= 0) listeners[event].splice(idx, 1);
    }
  },
};

module.exports = EventDispatcher;

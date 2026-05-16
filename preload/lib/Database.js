// Database adapter pattern
let _adapter = null;

const Database = {
  setAdapter(adapter) {
    _adapter = adapter;
  },
  getAdapter() {
    return _adapter;
  },
};

module.exports = Database;

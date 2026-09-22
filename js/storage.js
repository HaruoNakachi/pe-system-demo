/* storage.js
 * localStorage のラッパ。読み書きはすべて try/catch で囲む。
 * localStorage が使えない場合はメモリ上の state のみで動作を継続する。
 */

var PE_Storage = (function () {
  var memory = {};
  var available = false;
  var lastError = null;

  try {
    var probeKey = '__pe_demo_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    available = true;
  } catch (e) {
    available = false;
    lastError = e;
  }

  function getRaw(key) {
    if (available) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        available = false;
        lastError = e;
      }
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }

  function setRaw(key, value) {
    memory[key] = value;
    if (available) {
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        available = false;
        lastError = e;
        return false;
      }
    }
    return false;
  }

  function removeRaw(key) {
    try {
      delete memory[key];
    } catch (e) {
      memory[key] = null;
    }
    if (available) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch (e) {
        available = false;
        lastError = e;
        return false;
      }
    }
    return false;
  }

  function getJSON(key, fallback) {
    var raw = getRaw(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      var parsed = JSON.parse(raw);
      return (parsed === null || parsed === undefined) ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    var raw;
    try {
      raw = JSON.stringify(value);
    } catch (e) {
      return false;
    }
    return setRaw(key, raw);
  }

  function clearKeys(keys) {
    var ok = true;
    for (var i = 0; i < keys.length; i++) {
      if (!removeRaw(keys[i])) ok = false;
    }
    return ok;
  }

  return {
    isAvailable: function () { return available; },
    getLastError: function () { return lastError; },
    getString: getRaw,
    setString: setRaw,
    getJSON: getJSON,
    setJSON: setJSON,
    remove: removeRaw,
    clearKeys: clearKeys
  };
})();

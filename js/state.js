/**
 * Serialize / deserialize calculator state for shareable URL hashes.
 * Format: compact query string in location.hash (no leading # in encode output).
 */
(function (global) {
  "use strict";

  var MAX_NAME_LEN = 48;
  var MAX_COMMENTS_LEN = 500;

  var KEYS = [
    "f",
    "fp",
    "u",
    "bw",
    "max",
    "rd",
    "c",
    "a_name",
    "a_type",
    "a_g",
    "a_tx",
    "a_nf",
    "b_name",
    "b_type",
    "b_g",
    "b_tx",
    "b_nf"
  ];

  function defaultState() {
    return {
      frequencyMHz: 5800,
      frequencyPreset: "5800",
      units: "mi",
      channelWidthMHz: 10,
      maxDistance: 50,
      readoutDistance: 10,
      comments: "",
      radioA: {
        name: "Radio A",
        antennaType: "panel",
        gain: 19,
        txPower: 27,
        noiseFloor: -95
      },
      radioB: {
        name: "Radio B",
        antennaType: "panel",
        gain: 19,
        txPower: 27,
        noiseFloor: -95
      }
    };
  }

  function round(n, digits) {
    var f = Math.pow(10, digits == null ? 3 : digits);
    return Math.round(Number(n) * f) / f;
  }

  function sanitizeName(value, fallback) {
    var s = String(value == null ? "" : value)
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim()
      .replace(/\s+/g, " ");
    if (!s) {
      return fallback;
    }
    if (s.length > MAX_NAME_LEN) {
      s = s.slice(0, MAX_NAME_LEN).trim();
    }
    return s || fallback;
  }

  function sanitizeComments(value) {
    var s = String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
    if (s.length > MAX_COMMENTS_LEN) {
      s = s.slice(0, MAX_COMMENTS_LEN);
    }
    return s;
  }

  function encode(state) {
    var p = new URLSearchParams();
    var comments = sanitizeComments(state.comments);
    p.set("f", String(round(state.frequencyMHz, 4)));
    p.set("fp", state.frequencyPreset || "custom");
    p.set("u", state.units === "km" ? "km" : "mi");
    p.set("bw", String(round(state.channelWidthMHz, 2)));
    p.set("max", String(round(state.maxDistance, 4)));
    p.set("rd", String(round(state.readoutDistance, 4)));
    if (comments) {
      p.set("c", comments);
    }
    p.set("a_name", sanitizeName(state.radioA.name, "Radio A"));
    p.set("a_type", state.radioA.antennaType);
    p.set("a_g", String(round(state.radioA.gain, 2)));
    p.set("a_tx", String(round(state.radioA.txPower, 2)));
    p.set("a_nf", String(round(state.radioA.noiseFloor, 2)));
    p.set("b_name", sanitizeName(state.radioB.name, "Radio B"));
    p.set("b_type", state.radioB.antennaType);
    p.set("b_g", String(round(state.radioB.gain, 2)));
    p.set("b_tx", String(round(state.radioB.txPower, 2)));
    p.set("b_nf", String(round(state.radioB.noiseFloor, 2)));
    return p.toString();
  }

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  function decode(hashOrQuery) {
    var raw = String(hashOrQuery || "").replace(/^#/, "");
    if (!raw) {
      return null;
    }
    var p = new URLSearchParams(raw);
    var hasAny = KEYS.some(function (k) {
      return p.has(k);
    });
    if (!hasAny) {
      return null;
    }
    var base = defaultState();
    var units = p.get("u") === "km" ? "km" : "mi";
    var fp = p.get("fp") || "custom";
    var f = num(p.get("f"), base.frequencyMHz);
    var bw = num(p.get("bw"), base.channelWidthMHz);
    var maxD = num(p.get("max"), base.maxDistance);
    var rd = num(p.get("rd"), base.readoutDistance);

    return {
      frequencyMHz: f,
      frequencyPreset: fp,
      units: units,
      channelWidthMHz: bw,
      maxDistance: Math.max(maxD, 0),
      readoutDistance: Math.max(rd, 0),
      comments: sanitizeComments(p.has("c") ? p.get("c") : ""),
      radioA: {
        name: sanitizeName(p.get("a_name"), base.radioA.name),
        antennaType: p.get("a_type") || base.radioA.antennaType,
        gain: num(p.get("a_g"), base.radioA.gain),
        txPower: num(p.get("a_tx"), base.radioA.txPower),
        noiseFloor: num(p.get("a_nf"), base.radioA.noiseFloor)
      },
      radioB: {
        name: sanitizeName(p.get("b_name"), base.radioB.name),
        antennaType: p.get("b_type") || base.radioB.antennaType,
        gain: num(p.get("b_g"), base.radioB.gain),
        txPower: num(p.get("b_tx"), base.radioB.txPower),
        noiseFloor: num(p.get("b_nf"), base.radioB.noiseFloor)
      }
    };
  }

  function shareUrl(state) {
    var base = location.origin + location.pathname;
    return base + "#" + encode(state);
  }

  global.SNRCalcState = {
    MAX_NAME_LEN: MAX_NAME_LEN,
    MAX_COMMENTS_LEN: MAX_COMMENTS_LEN,
    defaultState: defaultState,
    sanitizeName: sanitizeName,
    sanitizeComments: sanitizeComments,
    encode: encode,
    decode: decode,
    shareUrl: shareUrl
  };
})(typeof window !== "undefined" ? window : globalThis);

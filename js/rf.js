/**
 * Free-space path loss and link SNR helpers (Friis).
 * Distances for FSPL are always in miles internally.
 */
(function (global) {
  "use strict";

  var MI_PER_KM = 1 / 1.609344;
  var KM_PER_MI = 1.609344;
  var MIN_DISTANCE_MI = 0.01;

  /** Typical antenna gains (dBi) for AREDN-style planning presets. */
  var ANTENNA_GAINS = {
    omni: 5,
    sector: 14,
    panel: 19,
    dish: 30,
    yagi: 12,
    custom: null
  };

  var ANTENNA_LABELS = {
    omni: "Omni",
    sector: "Sector",
    panel: "Panel",
    dish: "Dish",
    yagi: "Yagi",
    custom: "Custom"
  };

  function clampDistanceMi(dMi) {
    if (!isFinite(dMi) || dMi < MIN_DISTANCE_MI) {
      return MIN_DISTANCE_MI;
    }
    return dMi;
  }

  function toMiles(distance, units) {
    return units === "km" ? distance * MI_PER_KM : distance;
  }

  function fromMiles(distanceMi, units) {
    return units === "km" ? distanceMi * KM_PER_MI : distanceMi;
  }

  /**
   * Free-space path loss in dB.
   * FSPL_dB = 20*log10(d_mi) + 20*log10(f_MHz) + 36.6
   */
  function fsplDb(distanceMi, freqMHz) {
    var d = clampDistanceMi(distanceMi);
    var f = Math.max(Number(freqMHz) || 0, 1e-6);
    return 20 * Math.log10(d) + 20 * Math.log10(f) + 36.6;
  }

  /** Received signal strength (dBm) for one direction. */
  function rssiDbm(txPowerDbm, txGainDbi, rxGainDbi, fspl) {
    return Number(txPowerDbm) + Number(txGainDbi) + Number(rxGainDbi) - Number(fspl);
  }

  /** SNR (dB) at the receiver. */
  function snrDb(rssi, noiseFloorDbm) {
    return Number(rssi) - Number(noiseFloorDbm);
  }

  /**
   * Noise-floor delta (dB) when channel bandwidth changes.
   * Thermal noise scales as 10*log10(newBw/oldBw).
   */
  function noiseFloorDeltaForBandwidth(oldBwMHz, newBwMHz) {
    var oldBw = Math.max(Number(oldBwMHz) || 0, 1e-9);
    var newBw = Math.max(Number(newBwMHz) || 0, 1e-9);
    return 10 * Math.log10(newBw / oldBw);
  }

  function linkAtDistance(distanceDisplay, units, freqMHz, tx, rx) {
    var dMi = toMiles(distanceDisplay, units);
    var fspl = fsplDb(dMi, freqMHz);
    var rssi = rssiDbm(tx.txPower, tx.gain, rx.gain, fspl);
    var snr = snrDb(rssi, rx.noiseFloor);
    return { distanceMi: dMi, fspl: fspl, rssi: rssi, snr: snr };
  }

  function sampleCurve(maxDistance, units, freqMHz, tx, rx, points) {
    var n = points || 100;
    var maxD = Math.max(Number(maxDistance) || 0, 0);
    var xs = [];
    var snrs = [];
    var i;
    var d;
    var link;
    for (i = 0; i <= n; i++) {
      d = (maxD * i) / n;
      link = linkAtDistance(d, units, freqMHz, tx, rx);
      xs.push(d);
      snrs.push(link.snr);
    }
    return { x: xs, snr: snrs };
  }

  global.SNRCalcRF = {
    MI_PER_KM: MI_PER_KM,
    KM_PER_MI: KM_PER_MI,
    MIN_DISTANCE_MI: MIN_DISTANCE_MI,
    ANTENNA_GAINS: ANTENNA_GAINS,
    ANTENNA_LABELS: ANTENNA_LABELS,
    toMiles: toMiles,
    fromMiles: fromMiles,
    fsplDb: fsplDb,
    rssiDbm: rssiDbm,
    snrDb: snrDb,
    noiseFloorDeltaForBandwidth: noiseFloorDeltaForBandwidth,
    linkAtDistance: linkAtDistance,
    sampleCurve: sampleCurve
  };
})(typeof window !== "undefined" ? window : globalThis);

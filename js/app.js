(function () {
  "use strict";

  var RF = window.SNRCalcRF;
  var State = window.SNRCalcState;

  var els = {
    comments: document.getElementById("comments"),
    freqPreset: document.getElementById("freq-preset"),
    freqCustomWrap: document.getElementById("freq-custom-wrap"),
    freqCustom: document.getElementById("freq-custom"),
    channelWidth: document.getElementById("channel-width"),
    units: document.getElementById("units"),
    maxDistance: document.getElementById("max-distance"),
    readoutDistance: document.getElementById("readout-distance"),
    readoutDistanceLabel: document.getElementById("readout-distance-label"),
    unitLabels: document.querySelectorAll(".unit-label"),
    shareLink: document.getElementById("share-link"),
    shareStatus: document.getElementById("share-status"),
    outFspl: document.getElementById("out-fspl"),
    outRssiAb: document.getElementById("out-rssi-ab"),
    outSnrAb: document.getElementById("out-snr-ab"),
    outRssiBa: document.getElementById("out-rssi-ba"),
    outSnrBa: document.getElementById("out-snr-ba"),
    labelRssiAb: document.getElementById("label-rssi-ab"),
    labelSnrAb: document.getElementById("label-snr-ab"),
    labelRssiBa: document.getElementById("label-rssi-ba"),
    labelSnrBa: document.getElementById("label-snr-ba"),
    radioA: document.querySelector('.radio-panel[data-radio="A"]'),
    radioB: document.querySelector('.radio-panel[data-radio="B"]')
  };

  var lastChannelWidth = 10;
  var chart = null;
  var statusTimer = null;

  function radioFromPanel(panel, fallbackName) {
    return {
      name: State.sanitizeName(panel.querySelector(".radio-name").value, fallbackName),
      antennaType: panel.querySelector(".antenna-type").value,
      gain: Number(panel.querySelector(".gain").value),
      txPower: Number(panel.querySelector(".tx-power").value),
      noiseFloor: Number(panel.querySelector(".noise-floor").value)
    };
  }

  function applyRadioToPanel(panel, radio) {
    panel.querySelector(".radio-name").value = radio.name;
    panel.querySelector(".radio-legend").textContent = radio.name;
    panel.querySelector(".antenna-type").value = radio.antennaType;
    panel.querySelector(".gain").value = radio.gain;
    panel.querySelector(".tx-power").value = radio.txPower;
    panel.querySelector(".noise-floor").value = radio.noiseFloor;
  }

  function currentFrequencyMHz() {
    if (els.freqPreset.value === "custom") {
      return Number(els.freqCustom.value);
    }
    return Number(els.freqPreset.value);
  }

  function readState() {
    return {
      frequencyMHz: currentFrequencyMHz(),
      frequencyPreset: els.freqPreset.value,
      units: els.units.value === "km" ? "km" : "mi",
      channelWidthMHz: Number(els.channelWidth.value),
      maxDistance: Number(els.maxDistance.value),
      readoutDistance: Number(els.readoutDistance.value),
      comments: State.sanitizeComments(els.comments.value),
      radioA: radioFromPanel(els.radioA, "Radio A"),
      radioB: radioFromPanel(els.radioB, "Radio B")
    };
  }

  function applyState(state) {
    els.comments.value = state.comments || "";
    els.freqPreset.value = state.frequencyPreset;
    els.freqCustom.value = state.frequencyMHz;
    syncCustomFreqVisibility();
    els.channelWidth.value = String(state.channelWidthMHz);
    lastChannelWidth = state.channelWidthMHz;
    els.units.value = state.units;
    els.maxDistance.value = state.maxDistance;
    syncUnitsLabels();
    syncReadoutRange(state.maxDistance, state.readoutDistance);
    applyRadioToPanel(els.radioA, state.radioA);
    applyRadioToPanel(els.radioB, state.radioB);
    syncCommentsSize();
  }

  var COMMENTS_MIN_LINES = 3;
  var COMMENTS_MAX_LINES = 30;

  function syncCommentsSize() {
    var ta = els.comments;
    if (!ta) {
      return;
    }
    var style = window.getComputedStyle(ta);
    var lineHeight = parseFloat(style.lineHeight);
    if (!isFinite(lineHeight) || lineHeight <= 0) {
      lineHeight = parseFloat(style.fontSize) * 1.4 || 20;
    }
    var padY =
      (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    var borderY =
      (parseFloat(style.borderTopWidth) || 0) +
      (parseFloat(style.borderBottomWidth) || 0);
    var minH = lineHeight * COMMENTS_MIN_LINES + padY + borderY;
    var maxH = lineHeight * COMMENTS_MAX_LINES + padY + borderY;

    ta.style.height = "auto";
    ta.style.overflowY = "hidden";
    var needed = Math.max(ta.scrollHeight, minH);
    if (needed <= maxH) {
      ta.style.height = needed + "px";
      ta.style.overflowY = "hidden";
    } else {
      ta.style.height = maxH + "px";
      ta.style.overflowY = "auto";
    }
  }

  function syncCustomFreqVisibility() {
    var custom = els.freqPreset.value === "custom";
    els.freqCustomWrap.hidden = !custom;
  }

  function syncUnitsLabels() {
    var label = els.units.value === "km" ? "km" : "mi";
    els.unitLabels.forEach(function (node) {
      node.textContent = label;
    });
  }

  function syncReadoutRange(maxDistance, readoutDistance) {
    var maxD = Math.max(Number(maxDistance) || 0, 0);
    els.readoutDistance.max = String(maxD);
    var rd = Number(readoutDistance);
    if (!isFinite(rd) || rd < 0) {
      rd = 0;
    }
    if (rd > maxD) {
      rd = maxD;
    }
    els.readoutDistance.value = String(rd);
    els.readoutDistanceLabel.textContent = formatNum(rd, 2);
  }

  function formatNum(n, digits) {
    if (!isFinite(n)) {
      return "—";
    }
    return Number(n).toFixed(digits);
  }

  function formatDb(n) {
    return formatNum(n, 1) + " dB";
  }

  function formatDbm(n) {
    return formatNum(n, 1) + " dBm";
  }

  function updateShareHref() {
    var url = State.shareUrl(readState());
    els.shareLink.href = url;
    return url;
  }

  function setStatus(msg) {
    els.shareStatus.textContent = msg || "";
    if (statusTimer) {
      clearTimeout(statusTimer);
    }
    if (msg) {
      statusTimer = setTimeout(function () {
        els.shareStatus.textContent = "";
      }, 2200);
    }
  }

  function buildThresholdPlugin() {
    var levels = [5, 10, 15, 20];
    return {
      id: "snrThresholds",
      afterDraw: function (c) {
        var yScale = c.scales.y;
        var xScale = c.scales.x;
        var ctx = c.ctx;
        levels.forEach(function (level) {
          var y = yScale.getPixelForValue(level);
          if (y < c.chartArea.top || y > c.chartArea.bottom) {
            return;
          }
          ctx.save();
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(196, 163, 90, 0.45)";
          ctx.lineWidth = 1;
          ctx.moveTo(xScale.left, y);
          ctx.lineTo(xScale.right, y);
          ctx.stroke();
          ctx.fillStyle = "rgba(196, 163, 90, 0.85)";
          ctx.font = "11px sans-serif";
          ctx.fillText(level + " dB", xScale.left + 4, y - 4);
          ctx.restore();
        });
      }
    };
  }

  function buildReadoutMarkerPlugin() {
    return {
      id: "readoutMarker",
      afterDatasetsDraw: function (c) {
        var rd = c.$readoutDistance;
        if (!isFinite(rd)) {
          return;
        }
        var xScale = c.scales.x;
        var yScale = c.scales.y;
        var area = c.chartArea;
        var x = xScale.getPixelForValue(rd);
        if (x < area.left || x > area.right) {
          return;
        }
        var ctx = c.ctx;
        var unit = c.$readoutUnit || "mi";
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = "rgba(232, 240, 234, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, area.top);
        ctx.lineTo(x, area.bottom);
        ctx.stroke();

        function drawPoint(snr, color) {
          if (!isFinite(snr)) {
            return;
          }
          var y = yScale.getPixelForValue(snr);
          if (y < area.top || y > area.bottom) {
            return;
          }
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.strokeStyle = "#04140c";
          ctx.lineWidth = 1.5;
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        drawPoint(c.$readoutAbSnr, "#3d9b6a");
        drawPoint(c.$readoutBaSnr, "#c4a35a");

        ctx.fillStyle = "rgba(232, 240, 234, 0.9)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        var label = formatNum(rd, 2) + " " + unit;
        var labelY = area.top + 12;
        ctx.fillText(label, x, labelY);
        ctx.restore();
      }
    };
  }

  function initChart() {
    var ctx = document.getElementById("snr-chart").getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "A → B SNR",
            data: [],
            borderColor: "#3d9b6a",
            backgroundColor: "rgba(61, 155, 106, 0.15)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15
          },
          {
            label: "B → A SNR",
            data: [],
            borderColor: "#c4a35a",
            backgroundColor: "rgba(196, 163, 90, 0.12)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.15,
            borderDash: [6, 3]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            labels: { color: "#e8f0ea" }
          },
          tooltip: {
            callbacks: {
              title: function (items) {
                if (!items.length) {
                  return "";
                }
                var u = els.units.value === "km" ? "km" : "mi";
                return formatNum(items[0].parsed.x, 2) + " " + u;
              },
              label: function (item) {
                return item.dataset.label + ": " + formatNum(item.parsed.y, 1) + " dB";
              }
            }
          }
        },
        scales: {
          x: {
            type: "linear",
            title: {
              display: true,
              text: "Distance (mi)",
              color: "#9bb0a2"
            },
            ticks: { color: "#9bb0a2" },
            grid: { color: "rgba(45, 74, 58, 0.55)" }
          },
          y: {
            title: {
              display: true,
              text: "SNR (dB)",
              color: "#9bb0a2"
            },
            ticks: { color: "#9bb0a2" },
            grid: { color: "rgba(45, 74, 58, 0.55)" }
          }
        },
        onClick: function (evt, _elements, c) {
          var xScale = c.scales.x;
          var x = xScale.getValueForPixel(evt.x);
          if (!isFinite(x)) {
            return;
          }
          var maxD = Number(els.maxDistance.value) || 0;
          x = Math.max(0, Math.min(maxD, x));
          els.readoutDistance.value = String(roundTo(x, 2));
          refresh();
        }
      },
      plugins: [buildThresholdPlugin(), buildReadoutMarkerPlugin()]
    });
  }

  function roundTo(n, digits) {
    var f = Math.pow(10, digits);
    return Math.round(n * f) / f;
  }

  function refresh(updateHref) {
    var state = readState();
    var unitLabel = state.units === "km" ? "km" : "mi";
    var freq = state.frequencyMHz;
    var a = state.radioA;
    var b = state.radioB;

    var nameA = a.name || "Radio A";
    var nameB = b.name || "Radio B";
    var labelAb = nameA + " → " + nameB;
    var labelBa = nameB + " → " + nameA;

    els.radioA.querySelector(".radio-legend").textContent = nameA;
    els.radioB.querySelector(".radio-legend").textContent = nameB;

    var curveAb = RF.sampleCurve(state.maxDistance, state.units, freq, a, b, 120);
    var curveBa = RF.sampleCurve(state.maxDistance, state.units, freq, b, a, 120);

    chart.data.datasets[0].label = labelAb + " SNR";
    chart.data.datasets[1].label = labelBa + " SNR";
    chart.data.datasets[0].data = curveAb.x.map(function (x, i) {
      return { x: x, y: curveAb.snr[i] };
    });
    chart.data.datasets[1].data = curveBa.x.map(function (x, i) {
      return { x: x, y: curveBa.snr[i] };
    });
    chart.options.scales.x.title.text = "Distance (" + unitLabel + ")";
    chart.options.scales.x.max = state.maxDistance;

    syncReadoutRange(state.maxDistance, state.readoutDistance);
    state.readoutDistance = Number(els.readoutDistance.value);
    els.readoutDistanceLabel.textContent = formatNum(state.readoutDistance, 2);

    var ab = RF.linkAtDistance(state.readoutDistance, state.units, freq, a, b);
    var ba = RF.linkAtDistance(state.readoutDistance, state.units, freq, b, a);

    chart.$readoutDistance = state.readoutDistance;
    chart.$readoutUnit = unitLabel;
    chart.$readoutAbSnr = ab.snr;
    chart.$readoutBaSnr = ba.snr;
    chart.update("none");

    els.labelRssiAb.textContent = labelAb + " RSSI";
    els.labelSnrAb.textContent = labelAb + " SNR";
    els.labelRssiBa.textContent = labelBa + " RSSI";
    els.labelSnrBa.textContent = labelBa + " SNR";

    els.outFspl.textContent = formatDb(ab.fspl);
    els.outRssiAb.textContent = formatDbm(ab.rssi);
    els.outSnrAb.textContent = formatDb(ab.snr);
    els.outRssiBa.textContent = formatDbm(ba.rssi);
    els.outSnrBa.textContent = formatDb(ba.snr);

    if (updateHref !== false) {
      updateShareHref();
    }
  }

  function onAntennaTypeChange(panel) {
    var type = panel.querySelector(".antenna-type").value;
    var preset = RF.ANTENNA_GAINS[type];
    if (preset != null) {
      panel.querySelector(".gain").value = preset;
    }
    refresh();
  }

  function onChannelWidthChange() {
    var next = Number(els.channelWidth.value);
    var delta = RF.noiseFloorDeltaForBandwidth(lastChannelWidth, next);
    [els.radioA, els.radioB].forEach(function (panel) {
      var nf = panel.querySelector(".noise-floor");
      nf.value = String(roundTo(Number(nf.value) + delta, 2));
    });
    lastChannelWidth = next;
    refresh();
  }

  function onUnitsChange() {
    var prevUnits = els.units.dataset.prev || "mi";
    var nextUnits = els.units.value === "km" ? "km" : "mi";
    if (prevUnits !== nextUnits) {
      var maxMi = RF.toMiles(Number(els.maxDistance.value), prevUnits);
      var rdMi = RF.toMiles(Number(els.readoutDistance.value), prevUnits);
      els.maxDistance.value = String(roundTo(RF.fromMiles(maxMi, nextUnits), 3));
      els.readoutDistance.value = String(roundTo(RF.fromMiles(rdMi, nextUnits), 3));
    }
    els.units.dataset.prev = nextUnits;
    syncUnitsLabels();
    refresh();
  }

  function bind() {
    els.comments.addEventListener("input", function () {
      syncCommentsSize();
      refresh();
    });
    window.addEventListener("resize", syncCommentsSize);
    els.freqPreset.addEventListener("change", function () {
      if (els.freqPreset.value !== "custom") {
        els.freqCustom.value = els.freqPreset.value;
      }
      syncCustomFreqVisibility();
      refresh();
    });
    els.freqCustom.addEventListener("input", function () {
      els.freqPreset.value = "custom";
      syncCustomFreqVisibility();
      refresh();
    });
    els.channelWidth.addEventListener("change", onChannelWidthChange);
    els.units.addEventListener("change", onUnitsChange);
    els.maxDistance.addEventListener("input", function () {
      syncReadoutRange(els.maxDistance.value, els.readoutDistance.value);
      refresh();
    });
    els.readoutDistance.addEventListener("input", refresh);

    [els.radioA, els.radioB].forEach(function (panel) {
      panel.querySelector(".radio-name").addEventListener("input", refresh);
      panel.querySelector(".antenna-type").addEventListener("change", function () {
        onAntennaTypeChange(panel);
      });
      ["gain", "tx-power", "noise-floor"].forEach(function (cls) {
        panel.querySelector("." + cls).addEventListener("input", refresh);
      });
    });

    els.shareLink.addEventListener("click", function (evt) {
      // Left-click copies; right-click "Copy link address" still uses the live href.
      evt.preventDefault();
      copyShareUrl();
    });
  }

  function copyShareUrl() {
    var url = updateShareHref();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        function () {
          setStatus("Copied");
        },
        function () {
          fallbackCopy(url);
        }
      );
    } else {
      fallbackCopy(url);
    }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setStatus("Copied");
    } catch (err) {
      setStatus("Copy failed — right-click the Share link instead");
    }
    document.body.removeChild(ta);
  }

  function boot() {
    var fromHash = State.decode(location.hash);
    var state = fromHash || State.defaultState();
    applyState(state);
    els.units.dataset.prev = state.units;
    initChart();
    bind();
    refresh();
    requestAnimationFrame(syncCommentsSize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

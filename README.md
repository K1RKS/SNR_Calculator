# SNR Calculator

Interactive web page that graphs **signal-to-noise ratio (SNR) versus distance** between two Wi-Fi radios over free space. Aimed at AREDN-style site planning.

## Features

- SNR vs distance for **both directions** (A→B and B→A)
- Frequency presets: **5.8 GHz**, **2.4 GHz**, **900 MHz**, plus custom MHz
- Channel width (5 / 10 / 20 / 40 MHz) with thermal noise-floor scaling
- Per-radio antenna type presets, gain, TX power, and noise floor
- Distance units: **miles** (default) or kilometers
- Distance readout for FSPL, RSSI, and SNR
- **Share link** that encodes the full configuration in the URL hash

## Path model

Uses Friis **free-space path loss** only (no terrain, Fresnel clearance, or obstruction modeling):

```
FSPL(dB) = 20·log10(d_miles) + 20·log10(f_MHz) + 36.6
RSSI(dBm) = P_tx + G_tx + G_rx − FSPL
SNR(dB)   = RSSI − noise_floor_rx
```

Near-zero distances are clamped for the logarithm so the curve stays finite at the origin.

Changing channel width adjusts both radios’ noise floors by `10·log10(new_bw / old_bw)`.

## Hosting

Static files only — no server-side code or secrets.

Serve the repository root (or a copy of it) with any static web server so that `index.html` is reachable. Example NGINX fragment with placeholders:

```nginx
location /SNR_Calculator/ {
    alias /path/to/SNR_Calculator/;
    try_files $uri $uri/ /SNR_Calculator/index.html;
}
```

Chart.js is shipped under `js/` (`chart.umd.min.js`) so the page works without an external CDN. Prefer `js/` over a top-level `vendor/` directory — some shared nginx configs deny URL path segments named `vendor`.

## Share links

The **Share link** / **Copy share link** controls build a URL of the form:

```
https://your-host/path/to/page/#f=5800&u=mi&bw=10&...
```

Opening that URL restores frequency, units, channel width, distances, and both radio settings.

## License

See [LICENSE](LICENSE). Chart.js is MIT-licensed; see [js/LICENSE-chartjs.txt](js/LICENSE-chartjs.txt).

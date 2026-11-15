# SNR Calculator

Interactive web page that graphs **signal-to-noise ratio (SNR) versus distance** between two Wi-Fi radios over free space. Aimed at AREDN-style site planning.

Repository: https://github.com/K1RKS/SNR_Calculator

## Features

- SNR vs distance for **both directions** (A→B and B→A)
- Frequency presets: **5.8 GHz**, **2.4 GHz**, **900 MHz**, plus custom MHz
- Channel width (5 / 10 / 20 / 40 MHz) with thermal noise-floor scaling
- Per-radio **names**, antenna type presets, gain, TX power, and noise floor
- Distance units: **miles** (default) or kilometers
- Distance readout for FSPL, RSSI, and SNR
- Optional **Comments** field (preserved in the share URL)
- **Share link** that encodes the full configuration (including names and comments) in the URL hash

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

The **Share link** control builds a URL of the form:

```
https://your-host/path/to/page/#f=5800&u=mi&bw=10&rd=12.5&c=Site+notes&a_name=North&b_name=South&...
```

Opening that URL restores frequency, units, channel width, max/readout distances, comments, radio names, and both radios’ RF settings. Other sites can deep-link with those hash parameters to pre-fill the page.

Useful hash keys:

- `rd` — readout distance (also draws the graph marker)
- `c` — comments (up to 2000 characters)
- `a_name` / `b_name` — radio display names

## License

See [LICENSE](LICENSE). Chart.js is MIT-licensed; see [js/LICENSE-chartjs.txt](js/LICENSE-chartjs.txt).

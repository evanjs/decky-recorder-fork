# Decky Recorder Fork

Original Repo: https://github.com/marissa999/decky-recorder?tab=readme-ov-file

### Using enhanced mic noise cancellation

Optionally, you can download an enhanced noise cancellation binary for better noise cancellation from <https://github.com/werman/noise-suppression-for-voice>. If you run the script below, the binary will be extracted to `/home/deck/homebrew/data/decky-recorder/librnnoise_ladspa.so`. The recorder backend will automatically check for this and will use this noise cancellation binary instead of the default cancellation if it exists.

```bash
# Download gpl-3 binary for superior denoising (cannot include in this repo as gpl)

# Define the URLs and file paths
denoise_version="1.03"
denoise_zip_url="https://github.com/werman/noise-suppression-for-voice/releases/download/v${denoise_version}/linux-rnnoise.zip"
denoise_zip_file_path="/home/deck/homebrew/data/decky-recorder/linux-rnnoise.zip"
denoise_extracted_file_path="/home/deck/homebrew/data/decky-recorder/librnnoise_ladspa.so"

wget "${denoise_zip_url}" -O "${denoise_zip_file_path}"
unzip -j "${denoise_zip_file_path}" 'linux-rnnoise/ladspa/librnnoise_ladspa.so' -d /tmp
mv /tmp/librnnoise_ladspa.so "${denoise_extracted_file_path}"
```

Once you do this, reopen decky recorder, restart the microphone toggle, and you should see options to change the noise reduction percentage.

### Building
If you want to build this plugin in theory you only need to run `make init` first, fill out details in the `.env` file, and then run `make it`. You will need the following:
- node 18 (I recommend using nvm)
- jq
- pnpm
- python + pip
- Docker

Readme from the original author of the repo marisaa999 below:

![Decky-Recorder Example Screenshot](decky-recorder-screenshot.png)

This plugin is heavily based on the Recapture-Plugin for Crankshaft from Avery: https://git.sr.ht/~avery/recapture
In particular a lot of code for the gst-launch-1.0-command itself and the additionally needed dependencies were taken from the Recapture-Plugin.

https://git.sr.ht/~avery/recapture/tree/0fdbe014ec1f11bce386dc9468a760f8aed492e9/item/record.go#L19
https://git.sr.ht/~avery/recapture/tree/0fdbe014ec1f11bce386dc9468a760f8aed492e9/item/plugin/src/index.tsx#L161
https://git.sr.ht/~avery/recapture/tree/0fdbe014ec1f11bce386dc9468a760f8aed492e9/item/plugin/Makefile#L22

This plugin was made with the decky-plugin-template (https://github.com/SteamDeckHomebrew/decky-plugin-template)

Please do not judge my code, I am bad!

This plugin is still in WIP.

### Thanks
- Huge huge thanks to [@safijari](https://github.com/safijari) for fully implementing Rolling Recording/Replay Mode (https://github.com/safijari/decky-recorder/tree/rolling-record)
- [@Newbytee](https://github.com/Newbytee) for pointing out that I forgot the "-e"-option in the gst-launch-1.0-command
- Avery for the original Recapture Plugin
- Epictek for inspiring me to setup a proper build process (https://github.com/Epictek/DeckyStream I found out about this plugin when I was basically already done q.q)
- [kleutzinger](https://github.com/kleutzinger) for fixing the file names and making it so it confirms with ISO_8601
- [DerpyChap](https://github.com/DerpyChap) for adding a few audio related improvements (AAC and Stereo)

### Known issues
- It seems like long recordings (over 30 minutes) dont get saved (https://github.com/marissa999/decky-recorder/issues/2#issuecomment-1445399044)
- It seems like starting a recording while docked and outputting to a 4k monitor causes the Deck to crash (https://github.com/marissa999/decky-recorder/issues/8)

### FAQs
#### Can I save to the SD card / some other location?
This is not yet configurable through the plugin but yes. What you would do instead is
1. Move your `Videos` folder to the new destination (e.g. `/run/media/mmcblk0p1`)
2. Make a symbolic link (e.g. `ln -s /run/media/mmcblk0p1 /home/deck/Videos`)

Now it'll look like there's a Videos folder on your ssd but the data will actually be in the SD card.

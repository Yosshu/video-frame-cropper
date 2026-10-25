#!/usr/bin/env bash
# Generates the small test videos in tests/fixtures. Each frame shows its own frame number as
# 8 vertical stripes (bit 0 on the left; white = 1), so tests can read the frame number back
# from pixels. Requires ffmpeg with libx264 and libvpx.
set -euo pipefail
cd "$(dirname "$0")/../tests/fixtures"

pattern="geq=lum='if(mod(floor(N/pow(2,floor(X*8/W))),2),235,16)':cb=128:cr=128"

# H.264 with B-frames and a key frame every 60 frames: 150 frames at 30 fps.
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "color=black:size=320x180:rate=30:duration=5" \
  -vf "$pattern" -c:v libx264 -preset veryfast -g 60 -bf 2 -pix_fmt yuv420p -movflags +faststart \
  frames-h264.mp4

# VP9 in WebM: 100 frames at 25 fps.
ffmpeg -hide_banner -loglevel error -y -f lavfi -i "color=black:size=320x180:rate=25:duration=4" \
  -vf "$pattern" -c:v libvpx-vp9 -b:v 200k -g 50 -deadline realtime -cpu-used 8 -pix_fmt yuv420p \
  frames-vp9.webm

ls -l frames-h264.mp4 frames-vp9.webm

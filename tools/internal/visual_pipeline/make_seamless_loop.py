import os
import sys
import subprocess
import imageio_ffmpeg

def create_seamless_loop(input_path, output_path, transition_sec=2.0):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    
    # 1. Probe input duration
    probe_cmd = [
        ffmpeg, '-i', input_path
    ]
    p = subprocess.run(probe_cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    
    # Extract duration from stderr
    import re
    m = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.\d+)', p.stderr)
    if not m:
        raise ValueError(f"Could not determine duration for {input_path}")
    
    hours, mins, secs = float(m.group(1)), float(m.group(2)), float(m.group(3))
    total_sec = hours * 3600 + mins * 60 + secs
    print(f"[*] Input video: {input_path}")
    print(f"[*] Original duration: {total_sec:.2f}s, transition: {transition_sec:.2f}s")
    
    if total_sec <= transition_sec * 2:
        transition_sec = total_sec / 3.0
        print(f"[!] Adjusted transition to {transition_sec:.2f}s")
        
    d = transition_sec
    main_dur = total_sec - d
    offset = main_dur - d
    new_dur = total_sec - d
    
    # Filtergraph:
    # [0:v] split [v1][v2]
    # [v1] trim=start=d:end=total_sec,setpts=PTS-STARTPTS [main]
    # [v2] trim=start=0:end=d,setpts=PTS-STARTPTS [lead]
    # [main][lead] xfade=transition=fade:duration=d:offset=offset [outv]
    filter_complex = (
        f"[0:v]fps=24,split=2[v1][v2];"
        f"[v1]trim=start={d:.3f}:end={total_sec:.3f},setpts=PTS-STARTPTS,fps=24[main];"
        f"[v2]trim=start=0:end={d:.3f},setpts=PTS-STARTPTS,fps=24[lead];"
        f"[main][lead]xfade=transition=fade:duration={d:.3f}:offset={offset:.3f}[outv]"
    )
    
    cmd = [
        ffmpeg, '-y',
        '-i', input_path,
        '-filter_complex', filter_complex,
        '-map', '[outv]',
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'slow',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        output_path
    ]
    
    print("[*] Running ffmpeg command...")
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(res.stderr)
        raise RuntimeError("FFmpeg failed")
        
    print(f"[+] Seamless loop created successfully: {output_path}")
    print(f"[+] New duration: {new_dur:.2f}s (starts and ends on the exact same frame)")

if __name__ == '__main__':
    src = "repo/src/assets/video/gemini_generated_video_50f3f52f.mp4"
    dst = "repo/src/assets/video/gemini_generated_video_50f3f52f_seamless.mp4"
    trans = 2.5

    if len(sys.argv) > 1 and sys.argv[1]:
        # If first arg is a file
        if os.path.isfile(sys.argv[1]):
            src = sys.argv[1]
            base, ext = os.path.splitext(src)
            dst = f"{base}_seamless{ext}"
        else:
            try:
                trans = float(sys.argv[1])
            except ValueError:
                pass

    if len(sys.argv) > 2:
        dst = sys.argv[2]
    if len(sys.argv) > 3:
        try:
            trans = float(sys.argv[3])
        except ValueError:
            pass

    create_seamless_loop(src, dst, trans)

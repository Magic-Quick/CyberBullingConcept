with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "[AUDIO DIRECTOR] Music Cues JSON:" in line:
        new_lines.append("    console.log('[AUDIO DIRECTOR] Music Cues JSON:\\n', json);\n")
    elif i > 0 and "[AUDIO DIRECTOR] Music Cues JSON:" in lines[i-1]:
        # skip broken continuation line
        continue
    else:
        new_lines.append(line)

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('Fixed!')

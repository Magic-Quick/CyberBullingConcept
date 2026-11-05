import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect _initDirectorMusicCues
idx_init = content.find('private _initDirectorMusicCues(): void {')
print('Found _initDirectorMusicCues at:', idx_init)

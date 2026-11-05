import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('repo/src/MovieApp.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect where class fields are declared to add director fields
idx_fields = content.find('private _debugExpanded = false;')
print('Found _debugExpanded at:', idx_fields)

fields_code = '''  // Audio Director Suite State & Cues
  private _selectedDreadIndex = 0;
  private _selectedPeaceIndex = 0;
  private _directorActiveTab: 'cues' | 'ambient' = 'cues';
  private _directorMusicCues: Map<string, { id: string; actId: string; time: number; key: string; name: string; category: 'dread' | 'peace' | 'stop' }[]> = new Map();
  private _lastFiredMusicCueId: string | null = null;
  private _directorTabBtnCues!: Container;
  private _directorTabBtnAmb!: Container;
  private _directorCuesPanel!: Container;
  private _directorAmbientPanel!: Container;
  private _directorActTimeText!: Text;
  private _directorDreadText!: Text;
  private _directorPeaceText!: Text;
  private _directorCuesListContainer!: Container;
  private _directorNoticeText!: Text;
'''

if 'private _directorMusicCues' not in content:
    content = content[:idx_fields] + fields_code + content[idx_fields:]
    print('Added Director fields!')

with open('repo/src/MovieApp.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Phase 2 complete!')

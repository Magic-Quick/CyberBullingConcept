import os, re

for root, dirs, files in os.walk('repo/src'):
    for file in files:
        if file.endswith(('.ts', '.js', '.json')):
            p = os.path.join(root, file)
            with open(p, 'r', encoding='utf-8') as f:
                c = f.read()
                if 'retro_film_management_time_machine_v1' in c:
                    print(f"Found in {p}")
                    for line_no, l in enumerate(c.splitlines()):
                        if 'retro_film_management_time_machine_v1' in l:
                            print(f"  {line_no+1}: {l.strip()}")

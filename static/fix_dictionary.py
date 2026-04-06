import re

file_path = "dashboard_i18n.js"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. Reconstruct LANG_CONFIG
new_lines = []
for i in range(23): # Header
    new_lines.append(lines[i])

lang_lines = lines[23:33] # en to bn
new_lines.extend(lang_lines)
new_lines.append('    or: { label: "OR", name: "ଓଡ଼ିଆ" }\n')
new_lines.append("  };\n\n")
new_lines.append("  const STRINGS = {\n")

# 2. Find where the keys started and ended
# The keys started at old line 34 (now in our current broken file)
# But wait, our previous `add_js_keys.py` and `add_extra_keys.py` added keys at the end of the first `  };`
# Let's just find all lines that look like "key": { ... } and move them to STRINGS

key_pattern = re.compile(r'^\s*"[^"]+":\s*\{.*\},?\s*$')

# We need to skip the first 33 lines which we already handled
# Then collect all keys.
# Then find the original STRINGS start and append those too.

collected_keys = []
in_original_strings = False

for line in lines[33:]:
    if 'const STRINGS = {' in line:
        in_original_strings = True
        continue
    if in_original_strings:
        if line.strip() == '};' or 'DT = {' in line:
            in_original_strings = False
            continue
        if key_pattern.match(line) or line.strip().startswith("//"):
            collected_keys.append(line)
    else:
        if key_pattern.match(line):
            collected_keys.append(line)

new_lines.extend(collected_keys)
new_lines.append("  };\n\n")

# 3. Add the rest of the file (DT object and functions)
found_dt = False
for line in lines:
  if 'window.DT = {' in line:
    found_dt = True
  if found_dt:
    new_lines.append(line)

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("SUCCESS: dashboard_i18n.js restored and organized.")

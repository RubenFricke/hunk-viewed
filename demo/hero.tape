# The README demo. Run it through demo/record.sh, which builds the fixture
# repository, points HUNK_VIEWED_DEMO at it and checks the result.
Output demo/out/hero.gif
Require hunk

Set Shell bash
Set FontSize 16
Set Width 940
Set Height 540
Set Padding 12
Set Framerate 12
Set TypingSpeed 40ms

Env HUNK_DISABLE_UPDATE_NOTICE "1"
Env HUNK_MCP_DISABLE "1"

Hide
Type `export XDG_CONFIG_HOME="$HUNK_VIEWED_DEMO/config" XDG_STATE_HOME="$HUNK_VIEWED_DEMO/state"` Enter
Type `cd "$HUNK_VIEWED_DEMO/repo" && clear` Enter
Type `hunk diff --theme github-dark --mode unified --extension "$HUNK_VIEWED_ROOT"` Enter
Wait+Screen@15s /0 of 5 files viewed/
# The first key after startup can get lost; spend it on a harmless one.
Type "?"
Sleep 400ms
Escape
Sleep 400ms
Show

Sleep 1500ms
Type "x"
Sleep 1600ms
Type "x"
Sleep 1600ms
Type "x"
Sleep 2500ms
Type "k"
Sleep 900ms
Type "x"
Sleep 2500ms

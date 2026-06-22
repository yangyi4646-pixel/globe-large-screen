#!/bin/bash
# 用法: bash demo/switch.sh 1   (切到场景1)
#       bash demo/switch.sh 0   (恢复默认)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC="$SCRIPT_DIR/../public/settings.json"

case "$1" in
  1) SRC="$SCRIPT_DIR/scenario-01-brand-color.json"      ; LABEL="场景1 品牌色 #3FCB95" ;;
  2) SRC="$SCRIPT_DIR/scenario-02-crisis-typhoon.json"   ; LABEL="场景2 台风危机故事" ;;
  3) SRC="$SCRIPT_DIR/scenario-03-medical-logistics.json"; LABEL="场景3 医疗物流术语" ;;
  4) SRC="$SCRIPT_DIR/scenario-04-monitor-mode.json"     ; LABEL="场景4 监控模式" ;;
  5) SRC="$SCRIPT_DIR/scenario-05-southeast-asia.json"   ; LABEL="场景5 华南片区" ;;
  0) SRC=""                                               ; LABEL="默认" ;;
  *) echo "用法: bash demo/switch.sh [0-5]"; exit 1 ;;
esac

if [ -z "$SRC" ]; then
  cat > "$PUBLIC" << 'EOF'
{
    "$schema": "./settings.schema.json",
    "page": {
        "pgType": "LARGE_SCREEN",
        "exemptDesignLint": true,
        "exemptReason": "TowerX 高端大屏，详见 docs/design/ADR-001-towerx-large-screen-exemption.md"
    },
    "mode": "demo"
}
EOF
else
  cp "$SRC" "$PUBLIC"
fi

echo "✓ 已切换到：$LABEL — 刷新浏览器查看效果"

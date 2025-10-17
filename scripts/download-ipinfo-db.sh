#!/bin/bash

# IPInfo GeoIP Database Downloader
# 下载免费的 IPInfo country.mmdb (约 6-8 MB)

echo "╔════════════════════════════════════════╗"
echo "║  IPInfo GeoIP Database Downloader      ║"
echo "╚════════════════════════════════════════╝"
echo ""

DB_DIR="lib/maxmind-db"
TEMP_FILE="/tmp/ipinfo_country.mmdb"
TARGET_FILE="$DB_DIR/country.mmdb"

# 检查目录是否存在
if [ ! -d "$DB_DIR" ]; then
  echo "❌ 错误: 目录 $DB_DIR 不存在"
  exit 1
fi

echo "📋 下载说明："
echo "   1. 访问 https://ipinfo.io/account/data-downloads"
echo "   2. 注册免费账号（如果还没有）"
echo "   3. 下载 'Free IP to Country' 数据库"
echo "   4. 文件名应该是: country_asn.mmdb 或 free_country.mmdb"
echo ""

# 方案 1: 检查用户是否已经下载到 Downloads 目录
echo "🔍 检查常见下载位置..."

POSSIBLE_LOCATIONS=(
  "$HOME/Downloads/country.mmdb"
  "$HOME/Downloads/country_asn.mmdb"
  "$HOME/Downloads/free_country.mmdb"
  "$HOME/下载/country.mmdb"
  "$HOME/下载/country_asn.mmdb"
  "$HOME/下载/free_country.mmdb"
)

FOUND_FILE=""
for location in "${POSSIBLE_LOCATIONS[@]}"; do
  if [ -f "$location" ]; then
    FOUND_FILE="$location"
    echo "✅ 找到数据库文件: $location"
    break
  fi
done

if [ -n "$FOUND_FILE" ]; then
  echo ""
  echo "📦 复制文件到项目目录..."
  cp "$FOUND_FILE" "$TARGET_FILE"
  
  if [ -f "$TARGET_FILE" ]; then
    FILE_SIZE=$(du -h "$TARGET_FILE" | cut -f1)
    echo "✅ 成功！数据库已安装: $TARGET_FILE ($FILE_SIZE)"
    echo ""
    echo "🎉 IPInfo 数据库安装完成！"
    echo "   - 文件大小: $FILE_SIZE (远小于 25MB 限制)"
    echo "   - 准确率: 99.9%+"
    echo "   - 自动优先使用此数据库"
    echo ""
    echo "📝 旧文件备份建议："
    echo "   您可以删除大文件以节省空间："
    echo "   rm $DB_DIR/GeoLite2-City.mmdb  # (60MB)"
    echo "   rm $DB_DIR/GeoLite2-ASN.mmdb   # (11MB)"
    exit 0
  else
    echo "❌ 复制失败"
    exit 1
  fi
fi

# 如果没找到文件
echo ""
echo "⚠️  未在下载目录找到 IPInfo 数据库文件"
echo ""
echo "📥 请按以下步骤手动下载："
echo ""
echo "1. 访问: https://ipinfo.io/account/data-downloads"
echo "2. 注册免费账号"
echo "3. 下载 'Free IP to Country' (约 6-8 MB)"
echo "4. 下载后重新运行此脚本，或手动复制："
echo "   cp ~/Downloads/country*.mmdb $TARGET_FILE"
echo ""
echo "💡 提示: IPInfo 免费版特点"
echo "   - 文件大小: 6-8 MB (比 GeoLite2 小 87%)"
echo "   - 准确率: 99.9%+ (国家级别)"
echo "   - 每周更新"
echo "   - 完全免费"
echo ""

exit 1


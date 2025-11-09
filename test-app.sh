#!/bin/bash
# Quick test script for Classroom Finance 5.0

echo "🧪 Testing Classroom Finance 5.0..."
echo ""

# Check if server is running
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo "✅ Server is running on http://localhost:3001"
else
    echo "⚠️  Server not responding on port 3001"
    echo "   Try: http://localhost:3000"
fi

echo ""
echo "📂 Checking key files..."

FILES=(
    "src/lib/store.ts"
    "src/components/transactions/AddTransactionModal.tsx"
    "src/components/transactions/ScheduleTransactionForm.tsx"
    "src/components/transactions/NormalTransactionForm.tsx"
    "src/components/schedule/AddScheduleModal.tsx"
    "src/components/students/AddStudentModal.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

echo ""
echo "🎯 Test checklist:"
echo "1. Open http://localhost:3001 in your browser"
echo "2. Go to Transactions → Click 'เพิ่ม' → Try adding a transaction"
echo "3. Go to Schedule → Click 'เพิ่มกำหนดการ' → Create a schedule"
echo "4. Go to Students → Click '+' card → Add a student"
echo "5. Return to Dashboard → See updated metrics"
echo ""
echo "🎉 All interactive features should work!"

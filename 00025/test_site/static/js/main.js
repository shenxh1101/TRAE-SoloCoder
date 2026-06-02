// Test JavaScript file
console.log('External JS loaded successfully!');

function initPage() {
    var box = document.getElementById('js-box');
    if (box) {
        box.innerHTML = '<strong>✅ JavaScript executed successfully!</strong>';
        box.style.background = '#e8f5e9';
    }
}

document.addEventListener('DOMContentLoaded', initPage);

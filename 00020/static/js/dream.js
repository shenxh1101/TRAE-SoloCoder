function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    const investBtn = document.getElementById('investBtn');
    const incubateBtn = document.getElementById('incubateBtn');
    const submitComment = document.getElementById('submitComment');

    if (investBtn) {
        investBtn.addEventListener('click', async () => {
            const amount = document.getElementById('investAmount').value;
            try {
                const res = await fetch(`/api/dream/${DREAM_ID}/invest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: parseInt(amount) })
                });
                const data = await res.json();
                if (data.success) {
                    if (data.solution_generated) {
                        showToast('投资成功！已解锁AI圆梦方案！', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showToast('投资成功！', 'success');
                        location.reload();
                    }
                } else {
                    showToast(data.error, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('操作失败', 'error');
            }
        });
    }

    if (incubateBtn) {
        incubateBtn.addEventListener('click', async () => {
            if (!confirm('确定花费 200 币孵化这个梦想吗？')) return;
            try {
                const res = await fetch(`/api/dream/${DREAM_ID}/incubate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success) {
                    showToast('孵化成功！AI方案已生成！', 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showToast(data.error, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('操作失败', 'error');
            }
        });
    }

    if (submitComment) {
        submitComment.addEventListener('click', async () => {
            const content = document.getElementById('commentContent').value.trim();
            if (!content) {
                showToast('请输入评论内容', 'error');
                return;
            }
            try {
                const res = await fetch(`/api/dream/${DREAM_ID}/comment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('评论成功！', 'success');
                    location.reload();
                } else {
                    showToast(data.error, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('操作失败', 'error');
            }
        });
    }

    document.querySelectorAll('.vote-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const commentItem = this.closest('.comment-item');
            const commentId = commentItem.dataset.id;
            const voteType = this.dataset.type;
            
            try {
                const res = await fetch(`/api/comment/${DREAM_ID}/${commentId}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: voteType })
                });
                const data = await res.json();
                if (data.success) {
                    if (voteType === 'helpful') {
                        this.textContent = `👍 有帮助 (${data.comment.helpful})`;
                    } else {
                        this.textContent = `👎 扯淡 (${data.comment.bullshit})`;
                    }
                    this.disabled = true;
                    this.style.opacity = '0.5';
                    showToast('投票成功！', 'success');
                } else {
                    showToast(data.error, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('操作失败', 'error');
            }
        });
    });
});

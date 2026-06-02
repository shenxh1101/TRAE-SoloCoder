document.addEventListener('DOMContentLoaded', function() {
    const createModal = document.getElementById('createModal');
    const renameModal = document.getElementById('renameModal');
    const createDreamBtn = document.getElementById('createDreamBtn');
    const renameBtn = document.getElementById('renameBtn');
    const closeModal = document.getElementById('closeModal');
    const closeRenameModal = document.getElementById('closeRenameModal');
    const createForm = document.getElementById('createForm');
    const renameForm = document.getElementById('renameForm');

    if (createDreamBtn) {
        createDreamBtn.addEventListener('click', () => {
            createModal.classList.add('active');
        });
    }

    if (renameBtn) {
        renameBtn.addEventListener('click', () => {
            renameModal.classList.add('active');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            createModal.classList.remove('active');
        });
    }

    if (closeRenameModal) {
        closeRenameModal.addEventListener('click', () => {
            renameModal.classList.remove('active');
        });
    }

    createModal.addEventListener('click', (e) => {
        if (e.target === createModal) {
            createModal.classList.remove('active');
        }
    });

    renameModal.addEventListener('click', (e) => {
        if (e.target === renameModal) {
            renameModal.classList.remove('active');
        }
    });

    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('dreamTitle').value;
            const description = document.getElementById('dreamDesc').value;

            try {
                const res = await fetch('/api/dream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description })
                });
                const data = await res.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error);
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    if (renameForm) {
        renameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('newName').value;

            try {
                const res = await fetch('/api/user/rename', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('userName').textContent = data.name;
                    renameModal.classList.remove('active');
                } else {
                    alert(data.error);
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
});

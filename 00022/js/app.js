const ELEMENTS = {
    H: { symbol: 'H', name: '氢', valence: [1], color: '#FFFFFF', radius: 20, atomicWeight: 1.008 },
    C: { symbol: 'C', name: '碳', valence: [4], color: '#404040', radius: 30, atomicWeight: 12.011 },
    N: { symbol: 'N', name: '氮', valence: [3, 5], color: '#3050F8', radius: 28, atomicWeight: 14.007 },
    O: { symbol: 'O', name: '氧', valence: [2], color: '#FF0D0D', radius: 26, atomicWeight: 15.999 },
    F: { symbol: 'F', name: '氟', valence: [1], color: '#90E050', radius: 22, atomicWeight: 18.998 },
    P: { symbol: 'P', name: '磷', valence: [3, 5], color: '#FF8000', radius: 32, atomicWeight: 30.974 },
    S: { symbol: 'S', name: '硫', valence: [2, 4, 6], color: '#FFFF30', radius: 30, atomicWeight: 32.06 },
    Cl: { symbol: 'Cl', name: '氯', valence: [1], color: '#1FF01F', radius: 28, atomicWeight: 35.45 },
    Br: { symbol: 'Br', name: '溴', valence: [1], color: '#A62929', radius: 30, atomicWeight: 79.904 },
    I: { symbol: 'I', name: '碘', valence: [1], color: '#940094', radius: 34, atomicWeight: 126.90 }
};

const MOLECULE_LIBRARY = [
    { formula: 'H2O', name: '水', englishName: 'Water', description: '生命之源' },
    { formula: 'CO2', name: '二氧化碳', englishName: 'Carbon Dioxide', description: '温室气体' },
    { formula: 'CH4', name: '甲烷', englishName: 'Methane', description: '天然气主要成分' },
    { formula: 'NH3', name: '氨', englishName: 'Ammonia', description: '重要化工原料' },
    { formula: 'O2', name: '氧气', englishName: 'Oxygen', description: '生命必需气体' },
    { formula: 'N2', name: '氮气', englishName: 'Nitrogen', description: '空气主要成分' },
    { formula: 'H2', name: '氢气', englishName: 'Hydrogen', description: '清洁能源' },
    { formula: 'C2H6O', name: '乙醇', englishName: 'Ethanol', description: '酒精' },
    { formula: 'C2H4O2', name: '乙酸', englishName: 'Acetic Acid', description: '醋酸' },
    { formula: 'NaCl', name: '氯化钠', englishName: 'Sodium Chloride', description: '食盐' },
    { formula: 'HCl', name: '盐酸', englishName: 'Hydrochloric Acid', description: '强酸' },
    { formula: 'H2SO4', name: '硫酸', englishName: 'Sulfuric Acid', description: '化工之母' }
];

const CHALLENGES = [
    { formula: 'H2O', name: '水', hint: 'H-O-H' },
    { formula: 'CO2', name: '二氧化碳', hint: 'O=C=O' },
    { formula: 'CH4', name: '甲烷', hint: 'C连4个H' },
    { formula: 'NH3', name: '氨', hint: 'N连3个H' },
    { formula: 'C2H6O', name: '乙醇', hint: 'C-C-OH' },
    { formula: 'C2H4O2', name: '乙酸', hint: 'CH3-COOH' }
];

const CHALLENGE_TEMPLATES = {
    H2O: {
        atoms: [
            { element: 'O', dx: 0, dy: 0 },
            { element: 'H', dx: -60, dy: -55 },
            { element: 'H', dx: 60, dy: -55 }
        ],
        bonds: [
            { a1: 0, a2: 1, type: 1 },
            { a1: 0, a2: 2, type: 1 }
        ]
    },
    CO2: {
        atoms: [
            { element: 'C', dx: 0, dy: 0 },
            { element: 'O', dx: -90, dy: 0 },
            { element: 'O', dx: 90, dy: 0 }
        ],
        bonds: [
            { a1: 0, a2: 1, type: 2 },
            { a1: 0, a2: 2, type: 2 }
        ]
    },
    CH4: {
        atoms: [
            { element: 'C', dx: 0, dy: 0 },
            { element: 'H', dx: -70, dy: -55 },
            { element: 'H', dx: 70, dy: -55 },
            { element: 'H', dx: -70, dy: 55 },
            { element: 'H', dx: 70, dy: 55 }
        ],
        bonds: [
            { a1: 0, a2: 1, type: 1 },
            { a1: 0, a2: 2, type: 1 },
            { a1: 0, a2: 3, type: 1 },
            { a1: 0, a2: 4, type: 1 }
        ]
    },
    NH3: {
        atoms: [
            { element: 'N', dx: 0, dy: 0 },
            { element: 'H', dx: -60, dy: -55 },
            { element: 'H', dx: 60, dy: -55 },
            { element: 'H', dx: 0, dy: 70 }
        ],
        bonds: [
            { a1: 0, a2: 1, type: 1 },
            { a1: 0, a2: 2, type: 1 },
            { a1: 0, a2: 3, type: 1 }
        ]
    },
    C2H6O: {
        atoms: [
            { element: 'C', dx: -80, dy: 0 },
            { element: 'C', dx: 0, dy: 0 },
            { element: 'O', dx: 80, dy: 0 },
            { element: 'H', dx: -80, dy: -70 },
            { element: 'H', dx: -145, dy: 35 },
            { element: 'H', dx: -15, dy: -70 },
            { element: 'H', dx: 80, dy: -70 },
            { element: 'H', dx: 15, dy: 65 },
            { element: 'H', dx: -50, dy: 65 }
        ],
        bonds: [
            { a1: 0, a2: 1, type: 1 },
            { a1: 1, a2: 2, type: 1 },
            { a1: 2, a2: 6, type: 1 },
            { a1: 0, a2: 3, type: 1 },
            { a1: 0, a2: 4, type: 1 },
            { a1: 0, a2: 5, type: 1 },
            { a1: 1, a2: 7, type: 1 },
            { a1: 1, a2: 8, type: 1 }
        ]
    },
    C2H4O2: {
        atoms: [
            { element: 'C', dx: -80, dy: 0 },
            { element: 'C', dx: 0, dy: 0 },
            { element: 'O', dx: 80, dy: -50 },
            { element: 'O', dx: 80, dy: 55 },
            { element: 'H', dx: -80, dy: -70 },
            { element: 'H', dx: -145, dy: 35 },
            { element: 'H', dx: -15, dy: -70 },
            { element: 'H', dx: 145, dy: 55 }
        ],
        bonds: [
            { a1: 0, a2: 1, type: 1 },
            { a1: 1, a2: 2, type: 2 },
            { a1: 1, a2: 3, type: 1 },
            { a1: 3, a2: 7, type: 1 },
            { a1: 0, a2: 4, type: 1 },
            { a1: 0, a2: 5, type: 1 },
            { a1: 0, a2: 6, type: 1 }
        ]
    }
};

class Atom {
    constructor(id, element, x, y) {
        this.id = id;
        this.element = element;
        this.x = x;
        this.y = y;
        this.bonds = [];
    }

    getBondCount(bonds) {
        let total = 0;
        for (const bondId of this.bonds) {
            const bond = bonds.find(b => b.id === bondId);
            if (bond) {
                total += bond.type;
            }
        }
        return total;
    }
}

class Bond {
    constructor(id, atom1Id, atom2Id, type) {
        this.id = id;
        this.atom1Id = atom1Id;
        this.atom2Id = atom2Id;
        this.type = type;
    }
}

class MoleculeGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.atoms = [];
        this.bonds = [];
        this.selectedAtom = null;
        this.bondType = 1;
        this.isDragging = false;
        this.draggedAtom = null;
        this.dragOffset = { x: 0, y: 0 };
        this.currentChallenge = 0;
        this.atomIdCounter = 0;
        this.bondIdCounter = 0;
        this.gridSize = 50;
        this.targetAtoms = [];
        this.targetBonds = [];
        this.challengeCompleted = false;
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.initElementLibrary();
        this.initEventListeners();
        this.computeTargetStructure();
        this.render();
        this.updateStats();
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth - 40;
        this.canvas.height = container.clientHeight - 40;
    }

    initElementLibrary() {
        const library = document.getElementById('element-library');
        library.innerHTML = '';
        
        for (const [symbol, data] of Object.entries(ELEMENTS)) {
            const card = document.createElement('div');
            card.className = 'element-card';
            card.draggable = true;
            card.dataset.element = symbol;
            
            card.innerHTML = `
                <div class="element-symbol" style="background-color: ${data.color}">${symbol}</div>
                <div class="element-name">${data.name}</div>
            `;
            
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('element', symbol);
            });
            
            library.appendChild(card);
        }
    }

    initEventListeners() {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const element = e.dataTransfer.getData('element');
            if (element) {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.addAtom(element, x, y);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));

        document.querySelectorAll('.bond-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.bond-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.bondType = parseInt(btn.dataset.bond);
                this.selectedAtom = null;
                this.render();
            });
        });

        document.getElementById('reset-btn').addEventListener('click', () => this.resetCanvas());
        document.getElementById('save-json-btn').addEventListener('click', () => this.saveJSON());
        document.getElementById('load-json-btn').addEventListener('click', () => document.getElementById('file-input').click());
        document.getElementById('file-input').addEventListener('change', (e) => this.loadJSON(e));
        document.getElementById('export-png-btn').addEventListener('click', () => this.exportPNG());
        document.getElementById('skip-challenge').addEventListener('click', () => this.nextChallenge());
        document.getElementById('prev-challenge').addEventListener('click', () => this.prevChallenge());

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.computeTargetStructure();
            this.render();
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const atom = this.getAtomAtPosition(x, y);
        
        if (atom) {
            if (this.selectedAtom === null) {
                this.selectedAtom = atom;
                this.isDragging = true;
                this.draggedAtom = atom;
                this.dragOffset = {
                    x: x - atom.x,
                    y: y - atom.y
                };
                this.render();
            } else if (this.selectedAtom !== atom) {
                this.addBond(this.selectedAtom, atom, this.bondType);
                this.selectedAtom = null;
                this.render();
            } else {
                this.selectedAtom = null;
                this.render();
            }
        } else {
            this.selectedAtom = null;
            this.render();
        }
    }

    handleMouseMove(e) {
        if (this.isDragging && this.draggedAtom) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.draggedAtom.x = x - this.dragOffset.x;
            this.draggedAtom.y = y - this.dragOffset.y;
            
            this.render();
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.draggedAtom = null;
    }

    handleRightClick(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const atom = this.getAtomAtPosition(x, y);
        if (atom) {
            this.removeAtom(atom.id);
            this.render();
            return;
        }

        const bond = this.getBondAtPosition(x, y);
        if (bond) {
            this.removeBond(bond.id);
            this.render();
        }
    }

    getAtomAtPosition(x, y) {
        for (const atom of this.atoms) {
            const elementData = ELEMENTS[atom.element];
            const distance = Math.sqrt((x - atom.x) ** 2 + (y - atom.y) ** 2);
            if (distance <= elementData.radius) {
                return atom;
            }
        }
        return null;
    }

    getBondAtPosition(x, y) {
        for (const bond of this.bonds) {
            const atom1 = this.atoms.find(a => a.id === bond.atom1Id);
            const atom2 = this.atoms.find(a => a.id === bond.atom2Id);
            if (atom1 && atom2) {
                const distance = this.pointToLineDistance(x, y, atom1.x, atom1.y, atom2.x, atom2.y);
                if (distance < 10) {
                    return bond;
                }
            }
        }
        return null;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    addAtom(element, x, y) {
        const id = `atom_${++this.atomIdCounter}`;
        const atom = new Atom(id, element, x, y);
        this.atoms.push(atom);
        this.render();
        this.updateStats();
        this.updateFormula();
        this.checkValence();
        this.checkChallenge();
    }

    removeAtom(atomId) {
        const atomIndex = this.atoms.findIndex(a => a.id === atomId);
        if (atomIndex !== -1) {
            const atom = this.atoms[atomIndex];
            for (const bondId of [...atom.bonds]) {
                this.removeBond(bondId);
            }
            this.atoms.splice(atomIndex, 1);
            this.updateStats();
            this.updateFormula();
            this.checkValence();
            this.checkChallenge();
        }
    }

    addBond(atom1, atom2, type) {
        const existingBond = this.bonds.find(b => 
            (b.atom1Id === atom1.id && b.atom2Id === atom2.id) ||
            (b.atom1Id === atom2.id && b.atom2Id === atom1.id)
        );

        if (existingBond) {
            this.showError('这两个原子之间已经有化学键了！');
            return;
        }

        const atom1CurrentBonds = atom1.getBondCount(this.bonds);
        const atom2CurrentBonds = atom2.getBondCount(this.bonds);
        const atom1Valence = ELEMENTS[atom1.element].valence;
        const atom2Valence = ELEMENTS[atom2.element].valence;

        const atom1Max = Math.max(...atom1Valence);
        const atom2Max = Math.max(...atom2Valence);

        if (atom1CurrentBonds + type > atom1Max) {
            this.showError(`${atom1.element} 原子的化合价已满！`);
            return;
        }

        if (atom2CurrentBonds + type > atom2Max) {
            this.showError(`${atom2.element} 原子的化合价已满！`);
            return;
        }

        const id = `bond_${++this.bondIdCounter}`;
        const bond = new Bond(id, atom1.id, atom2.id, type);
        this.bonds.push(bond);
        atom1.bonds.push(id);
        atom2.bonds.push(id);
        
        this.updateStats();
        this.updateFormula();
        this.checkValence();
        this.checkChallenge();
    }

    removeBond(bondId) {
        const bondIndex = this.bonds.findIndex(b => b.id === bondId);
        if (bondIndex !== -1) {
            const bond = this.bonds[bondIndex];
            const atom1 = this.atoms.find(a => a.id === bond.atom1Id);
            const atom2 = this.atoms.find(a => a.id === bond.atom2Id);
            
            if (atom1) {
                atom1.bonds = atom1.bonds.filter(id => id !== bondId);
            }
            if (atom2) {
                atom2.bonds = atom2.bonds.filter(id => id !== bondId);
            }
            
            this.bonds.splice(bondIndex, 1);
            this.updateStats();
            this.updateFormula();
            this.checkValence();
            this.checkChallenge();
        }
    }

    resetCanvas() {
        this.atoms = [];
        this.bonds = [];
        this.selectedAtom = null;
        this.atomIdCounter = 0;
        this.bondIdCounter = 0;
        this.challengeCompleted = false;
        this.render();
        this.updateStats();
        this.updateFormula();
        this.checkValence();
    }

    showError(message) {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = message;
        errorEl.classList.add('show');
        setTimeout(() => {
            errorEl.classList.remove('show');
        }, 2000);
    }

    checkValence() {
        const valenceStatus = document.getElementById('valence-status');
        let hasError = false;
        let errorAtoms = [];

        for (const atom of this.atoms) {
            const bondCount = atom.getBondCount(this.bonds);
            const valences = ELEMENTS[atom.element].valence;
            
            if (!valences.includes(bondCount) && bondCount > 0) {
                hasError = true;
                errorAtoms.push(atom.element);
            }
        }

        if (hasError) {
            valenceStatus.innerHTML = `<span class="status-error">⚠️ 化合价异常: ${errorAtoms.join(', ')}</span>`;
        } else {
            valenceStatus.innerHTML = `<span class="status-ok">✓ 所有原子化合价正常</span>`;
        }

        return !hasError;
    }

    getFormula() {
        if (this.atoms.length === 0) return '-';

        const counts = {};
        for (const atom of this.atoms) {
            counts[atom.element] = (counts[atom.element] || 0) + 1;
        }

        const order = ['C', 'H', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I'];
        let formula = '';
        
        for (const element of order) {
            if (counts[element]) {
                formula += element;
                if (counts[element] > 1) {
                    formula += counts[element];
                }
            }
        }

        for (const element of Object.keys(counts)) {
            if (!order.includes(element)) {
                formula += element;
                if (counts[element] > 1) {
                    formula += counts[element];
                }
            }
        }

        return formula;
    }

    formatFormula(formula) {
        if (formula === '-') return formula;
        return formula.replace(/(\d+)/g, '<sub>$1</sub>');
    }

    updateFormula() {
        const formula = this.getFormula();
        document.getElementById('formula-display').innerHTML = this.formatFormula(formula);
        
        const molecule = MOLECULE_LIBRARY.find(m => m.formula === formula);
        const nameEl = document.getElementById('molecule-name');
        
        if (molecule) {
            nameEl.textContent = molecule.name;
            nameEl.style.display = 'inline';
        } else if (formula !== '-') {
            nameEl.textContent = '未知分子';
            nameEl.style.display = 'inline';
        } else {
            nameEl.textContent = '-';
            nameEl.style.display = 'inline';
        }
    }

    checkChallenge() {
        const formula = this.getFormula();
        const challenge = CHALLENGES[this.currentChallenge];
        
        if (formula === challenge.formula && this.checkValence()) {
            this.challengeCompleted = true;
            const challengeText = document.getElementById('challenge-text');
            challengeText.innerHTML = `✓ 完成！${challenge.name}`;
            challengeText.style.color = '#10B981';
            this.render();
            
            setTimeout(() => {
                this.nextChallenge();
            }, 2000);
        }
    }

    nextChallenge() {
        this.currentChallenge = (this.currentChallenge + 1) % CHALLENGES.length;
        this.updateChallengeDisplay();
    }

    prevChallenge() {
        this.currentChallenge = (this.currentChallenge - 1 + CHALLENGES.length) % CHALLENGES.length;
        this.updateChallengeDisplay();
    }

    updateChallengeDisplay() {
        const challenge = CHALLENGES[this.currentChallenge];
        const challengeText = document.getElementById('challenge-text');
        challengeText.innerHTML = `搭建${challenge.name} (${this.formatFormula(challenge.formula)})`;
        challengeText.style.color = '#F59E0B';
        
        document.getElementById('challenge-progress').textContent = `挑战 ${this.currentChallenge + 1}/${CHALLENGES.length}`;
        this.challengeCompleted = false;
        this.computeTargetStructure();
        this.render();
    }

    computeTargetStructure() {
        const challenge = CHALLENGES[this.currentChallenge];
        const template = CHALLENGE_TEMPLATES[challenge.formula];
        
        if (!template) {
            this.targetAtoms = [];
            this.targetBonds = [];
            return;
        }

        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;

        this.targetAtoms = template.atoms.map((a, i) => ({
            element: a.element,
            x: cx + a.dx,
            y: cy + a.dy
        }));

        this.targetBonds = template.bonds.map(b => ({
            atom1Idx: b.a1,
            atom2Idx: b.a2,
            type: b.type
        }));
    }

    drawTargetStructure() {
        if (this.challengeCompleted || this.targetAtoms.length === 0) return;

        const ctx = this.ctx;
        const pulse = 0.6 + 0.15 * Math.sin(Date.now() / 600);

        for (const bond of this.targetBonds) {
            const a1 = this.targetAtoms[bond.atom1Idx];
            const a2 = this.targetAtoms[bond.atom2Idx];
            if (!a1 || !a2) continue;

            const dx = a2.x - a1.x;
            const dy = a2.y - a1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) continue;
            const nx = -dy / len;
            const ny = dx / len;

            const spacing = 6;
            const offset = (bond.type - 1) * spacing / 2;

            ctx.strokeStyle = `rgba(6, 182, 212, ${0.25 * pulse})`;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.setLineDash([8, 6]);

            for (let i = 0; i < bond.type; i++) {
                const offsetAmount = -offset + i * spacing;
                ctx.beginPath();
                ctx.moveTo(a1.x + nx * offsetAmount, a1.y + ny * offsetAmount);
                ctx.lineTo(a2.x + nx * offsetAmount, a2.y + ny * offsetAmount);
                ctx.stroke();
            }
        }

        ctx.setLineDash([]);

        for (const a of this.targetAtoms) {
            const elementData = ELEMENTS[a.element];
            const radius = elementData.radius;

            ctx.beginPath();
            ctx.arc(a.x, a.y, radius + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.35 * pulse})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(6, 182, 212, ${0.12 * pulse})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 * pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = `rgba(6, 182, 212, ${0.5 * pulse})`;
            ctx.font = `bold ${radius * 0.8}px Rajdhani`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.element, a.x, a.y);
        }
    }

    updateStats() {
        document.getElementById('atom-count').textContent = this.atoms.length;
        document.getElementById('bond-count').textContent = this.bonds.length;
        
        const singleBonds = this.bonds.filter(b => b.type === 1).length;
        const doubleBonds = this.bonds.filter(b => b.type === 2).length;
        const tripleBonds = this.bonds.filter(b => b.type === 3).length;
        
        document.getElementById('single-bond-count').textContent = singleBonds;
        document.getElementById('double-bond-count').textContent = doubleBonds;
        document.getElementById('triple-bond-count').textContent = tripleBonds;
    }

    saveJSON() {
        const data = {
            version: '1.0',
            createdAt: Date.now(),
            atoms: this.atoms,
            bonds: this.bonds
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `molecule_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadJSON(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    this.atoms = data.atoms || [];
                    this.bonds = data.bonds || [];
                    
                    this.atomIdCounter = this.atoms.length;
                    this.bondIdCounter = this.bonds.length;
                    
                    for (const atom of this.atoms) {
                        const num = parseInt(atom.id.replace('atom_', ''));
                        if (num > this.atomIdCounter) this.atomIdCounter = num;
                    }
                    for (const bond of this.bonds) {
                        const num = parseInt(bond.id.replace('bond_', ''));
                        if (num > this.bondIdCounter) this.bondIdCounter = num;
                    }
                    
                    this.render();
                    this.updateStats();
                    this.updateFormula();
                    this.checkValence();
                } catch (err) {
                    this.showError('文件格式错误！');
                }
            };
            reader.readAsText(file);
        }
        e.target.value = '';
    }

    exportPNG() {
        const link = document.createElement('a');
        link.download = `molecule_${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.clearRect(0, 0, width, height);

        this.drawGrid();
        this.drawTargetStructure();
        this.drawBonds();
        this.drawAtoms();

        if (this.targetAtoms.length > 0 && !this.challengeCompleted) {
            cancelAnimationFrame(this._animFrame);
            this._animFrame = requestAnimationFrame(() => this.render());
        }
    }

    drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.lineWidth = 1;

        for (let x = 0; x <= width; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y <= height; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    drawBonds() {
        const ctx = this.ctx;

        for (const bond of this.bonds) {
            const atom1 = this.atoms.find(a => a.id === bond.atom1Id);
            const atom2 = this.atoms.find(a => a.id === bond.atom2Id);
            
            if (atom1 && atom2) {
                const dx = atom2.x - atom1.x;
                const dy = atom2.y - atom1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const nx = -dy / len;
                const ny = dx / len;
                
                const spacing = 6;
                const offset = (bond.type - 1) * spacing / 2;
                
                ctx.strokeStyle = '#94A3B8';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                
                for (let i = 0; i < bond.type; i++) {
                    const offsetAmount = -offset + i * spacing;
                    ctx.beginPath();
                    ctx.moveTo(
                        atom1.x + nx * offsetAmount,
                        atom1.y + ny * offsetAmount
                    );
                    ctx.lineTo(
                        atom2.x + nx * offsetAmount,
                        atom2.y + ny * offsetAmount
                    );
                    ctx.stroke();
                }
            }
        }
    }

    drawAtoms() {
        const ctx = this.ctx;

        for (const atom of this.atoms) {
            const elementData = ELEMENTS[atom.element];
            const radius = elementData.radius;
            
            if (this.selectedAtom === atom) {
                ctx.beginPath();
                ctx.arc(atom.x, atom.y, radius + 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
                ctx.fill();
                ctx.strokeStyle = '#06B6D4';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            
            const gradient = ctx.createRadialGradient(
                atom.x - radius * 0.3,
                atom.y - radius * 0.3,
                0,
                atom.x,
                atom.y,
                radius
            );
            gradient.addColorStop(0, this.lightenColor(elementData.color, 30));
            gradient.addColorStop(1, elementData.color);
            
            ctx.beginPath();
            ctx.arc(atom.x, atom.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = this.getContrastColor(elementData.color);
            ctx.font = `bold ${radius * 0.8}px Rajdhani`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(atom.element, atom.x, atom.y);
        }
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    getContrastColor(color) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new MoleculeGame('molecule-canvas');
});

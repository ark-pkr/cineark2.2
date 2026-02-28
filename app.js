const { createApp } = Vue;

createApp({
    data() {
        return {
            secretClickCount: 0,
            userSession: null,
            isEditing: false,
            editingId: null,
            isRitualLoading: true,
            readyToEnter: false,
            isExiting: false,
            currentSinisterMsg: "Iniciando rituais...",
            sinisterPhrases: [
                "Drenando o vazio...", 
                "As runas chamam...", 
                "Invocando almas...", 
                "Selando o pacto...", 
                "Aura em ressonância..."
            ],
            // Runas para o círculo ritualístico
            runesList: ['ᚦ','ᚱ','ᚫ','ᚲ','ᚷ','ᚹ','ᚺ','ᚾ','ᛁ','ᛃ','ᛇ','ᛈ','ᛉ','ᛊ','ᛏ','ᛒ','ᛖ','ᛗ','ᛚ','ᛜ','ᛞ','ᛟ'],
            showModal: false,
            showLevelUp: false,
            isShaking: false,
            currentFilter: 'Todos',
            localSearch: '',
            searchResults: [],
            searchTimeout: null,
            newItem: { 
                title: '', 
                type: 'Manga', 
                poster: '', 
                currentcount: 0, 
                totalcount: 0, 
                rating: 10, 
                status: 'lendo',
                manga_id_api: '' 
            },
            catalog: [],
            xp: 0,
            dailyMissions: [],
            // Estilos aleatórios para as runas flutuantes de fundo
            runeStyles: Array.from({ length: 22 }, () => ({
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                fontSize: (Math.random() * 20 + 15) + 'px',
                opacity: Math.random() * 0.5 + 0.2,
                transform: 'translate(0,0)'
            }))
        };
    },
    computed: {
        level() { return Math.floor(this.xp / 100) + 1; },
        xpPercent() { return this.xp % 100; },
        rankTitle() {
            const titles = ['ERRANTE', 'CAMINHANTE', 'LORDE', 'ENTIDADE', 'ARCANGELO', 'ABISMO', 'ETERNIDADE'];
            return titles[Math.min(titles.length - 1, Math.floor((this.level - 1) / 10))];
        },
        filteredCatalog() {
            let list = this.catalog;
            if (this.currentFilter !== 'Todos') {
                list = list.filter(i => i.status === this.currentFilter);
            }
            if (this.localSearch) {
                list = list.filter(i => i.title.toLowerCase().includes(this.localSearch.toLowerCase()));
            }
            return list;
        }
    },
    async mounted() {
        this.startRitual();
        
        // Inicializa o serviço do Supabase (DbService deve estar no supabase-service.js)
        if (typeof DbService !== 'undefined') {
            DbService.onAuthChange((event, session) => {
                this.userSession = session;
            });
            await this.fetchCatalog();
        }

        this.initMissions();
    },
    methods: {
        // --- LÓGICA DE INTERFACE E RITUAL ---
        getCirclePos(n, total, radius) {
    const angle = (n / total) * (2 * Math.PI);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { transform: `translate(${x}px, ${y}px)` };
},

// Gera estilos aleatórios para as brasas (embers)
getEmberStyle() {
    return {
        left: Math.random() * 100 + '%',
        animationDuration: (Math.random() * 3 + 2) + 's',
        animationDelay: Math.random() * 5 + 's'
    };
},

// Define a cor da borda e brilho (aura) com base na nota
getAura(rating) {
    if (rating >= 9) return 'border-red-600 shadow-[0_0_15px_rgba(255,0,0,0.4)]';
    if (rating >= 7) return 'border-zinc-700 shadow-[0_0_10px_rgba(255,0,0,0.1)]';
    return 'border-zinc-900';
},

// Efeito de movimento das runas de fundo com o rato
parallaxRunes(e) {
    const { clientX, clientY } = e;
    this.runeStyles.forEach(style => {
        const moveX = (clientX - window.innerWidth / 2) * 0.05;
        const moveY = (clientY - window.innerHeight / 2) * 0.05;
        style.transform = `translate(${moveX}px, ${moveY}px)`;
    });
},

        // --- BUSCA MANGADEX COM CORREÇÃO DE CORS ---
        debounceBusca() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.buscarMangas(), 600);
        },
async buscarMangas() {
    if (this.newItem.title.length < 3) return;
    
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(async () => {
        try {
            // CORREÇÃO: Adicionar Proxy
            const proxy = "https://corsproxy.io/?";
            const targetUrl = `https://api.mangadex.org/manga?title=${encodeURIComponent(this.newItem.title)}&limit=5&includes[]=cover_art`;
            
            const response = await fetch(proxy + encodeURIComponent(targetUrl));
            const data = await response.json();
            
            this.searchResults = data.data.map(manga => {
                // ... mapeamento correto
            });
        } catch (e) {
            console.error("Erro na busca MangaDex", e);
        }
    }, 500);
},
        selectResult(res) {
            this.newItem.title = res.title;
            this.newItem.poster = res.poster;
            this.newItem.manga_id_api = res.id;
            this.searchResults = [];
        },

        // --- DATABASE (SUPABASE) ---
        async fetchCatalog() {
            try {
                this.catalog = await DbService.getCatalog();
            } catch (e) {
                console.error("Erro ao carregar catálogo:", e);
            }
        },
       async saveEntry() {
    if (!this.newItem.manga_id_api) {
        alert("Sussurre o nome correto e selecione um título da lista!");
        return;
    }
    try {
        const itemToSave = { ...this.newItem };
        // Upsert no Supabase
        await DbService.upsertItem(itemToSave, this.editingId);
        
        // Atualiza a lista local
        await this.fetchCatalog();
        
        // Finaliza modal e toca som
        this.closeModal();
        this.playSound('snd-slash');
        
        // Reseta o formulário
        this.newItem = { title: '', type: 'Manga', poster: '', currentcount: 0, totalcount: 0, rating: 10, status: 'lendo', manga_id_api: '' };
        this.editingId = null;
        this.isEditing = false;
        
    } catch (e) {
        console.error(e);
        alert("O pacto falhou. Verifique sua conexão com o abismo.");
    }
},
        async updateProgress(id, amount, current) {
            const novoValor = Math.max(0, current + amount);
            try {
                await DbService.updateProgress(id, novoValor);
                // Atualização otimista na interface
                const item = this.catalog.find(i => i.id === id);
                if (item) item.currentcount = novoValor;
                
                this.xp += 5;
                if (this.xp % 100 === 0) this.showLevelUp = true;
                this.playSound('snd-slash');
            } catch (e) {
                console.error("Erro ao atualizar progresso:", e);
            }
        },
        async deleteItem(id) {
            if (confirm("Deseja banir este selo para o vazio eterno?")) {
                await DbService.deleteItem(id);
                await this.fetchCatalog();
            }
        },

        // --- CONTROLES DE MODAL E RITUAL ---
        openModal() {
            this.showModal = true;
            this.isEditing = false;
            this.editingId = null;
            this.newItem = { title: '', type: 'Manga', poster: '', currentcount: 0, totalcount: 0, rating: 10, status: 'lendo', manga_id_api: '' };
        },
        editItem(item) {
            this.isEditing = true;
            this.editingId = item.id;
            this.newItem = { ...item };
            this.showModal = true;
        },
        closeModal() {
            this.showModal = false;
        },
        startRitual() {
            let i = 0;
            const interval = setInterval(() => {
                this.currentSinisterMsg = this.sinisterPhrases[i % this.sinisterPhrases.length];
                i++;
                if (i >= 3) this.readyToEnter = true;
                if (!this.isRitualLoading) clearInterval(interval);
            }, 1500);
        },
        endRitual() {
            if (this.readyToEnter) {
                this.isExiting = true;
                this.playSound('snd-hell');
                setTimeout(() => {
                    this.isRitualLoading = false;
                }, 1200);
            }
        },
        playSound(id) {
            const audio = document.getElementById(id);
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => { /* Interação do user necessária */ });
            }
        },
        initMissions() {
            this.dailyMissions = [
                { id: 1, text: "Consumir 5 capítulos", progress: 0, goal: 5, xp: 20 },
                { id: 2, text: "Invocar novo título", progress: 0, goal: 1, xp: 15 }
            ];
        }
    }
}).mount('#app');
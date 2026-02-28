// Configuração do Cliente do Submundo
const _supabase = supabase.createClient(
    'https://mdhtjszfehivxnyzgotl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRqc3pmZWhpdnhueXpnb3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTcyMzMsImV4cCI6MjA4NjQ3MzIzM30.Nkebv7WVRjYznIZddAKikX3cdKkFoNFjoIonlptARMo'
);

const DbService = {
    // Escuta mudanças de login/logout
    onAuthChange(callback) {
        _supabase.auth.onAuthStateChange(callback);
    },

    // Autenticação do Arconte
    async login(email, password) {
        return await _supabase.auth.signInWithPassword({ email, password });
    },

    // Busca todos os itens do catálogo
    async getCatalog() {
        const { data, error } = await _supabase
            .from('itens_catalogo')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Insere ou Atualiza um item (Selo)
    async upsertItem(item, id = null) {
        if (id) {
            const { data, error } = await _supabase
                .from('itens_catalogo')
                .update(item)
                .eq('id', id)
                .select();
            if (error) throw error;
            return data[0];
        } else {
            const { data, error } = await _supabase
                .from('itens_catalogo')
                .insert([item])
                .select();
            if (error) throw error;
            return data[0];
        }
    },

    // Atualiza o progresso (contador) rápido
    async updateProgress(id, newCount) {
        const { error } = await _supabase
            .from('itens_catalogo')
            .update({ currentcount: newCount })
            .eq('id', id);
        if (error) throw error;
    },

    // Remove um item permanentemente
    async deleteItem(id) {
        const { error } = await _supabase
            .from('itens_catalogo')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};
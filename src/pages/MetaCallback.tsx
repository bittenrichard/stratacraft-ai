import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function MetaCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Pega o código da URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('Código não fornecido pelo Facebook');
        }

        // Detecta ambiente para redirect_uri
        const isLocal = window.location.hostname === 'localhost';
        const redirectUri = isLocal
          ? 'http://localhost:8080/oauth/meta/callback'
          : 'https://dashboard.agenciastorytelling.com.br/oauth/meta/callback';

        console.log('Usando redirect_uri:', redirectUri);
        console.log('Código recebido:', code);

        // Faz a troca do código pelo token
        const response = await fetch('http://localhost:3001/api/meta-exchange-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            redirect_uri: redirectUri
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Erro ao trocar código por token');
        }

        const data = await response.json();
        
        // Salva o token e informações da conta no localStorage
        localStorage.setItem('meta_access_token', data.access_token);
        if (data.account_info) {
          localStorage.setItem('meta_account_info', JSON.stringify(data.account_info));
        }
        
        // Notifica o usuário
        toast({
          title: "Conexão bem sucedida!",
          description: `Conta ${data.account_info?.name || ''} conectada com sucesso.`
        });

        // Redireciona de volta para a página inicial e sinaliza para abrir a tab de integrações
        localStorage.setItem('openTab', 'integrations');
        navigate('/');
      } catch (error: any) {
        console.error('Erro no callback:', error);
        toast({
          title: "Erro na conexão",
          description: error.message,
          variant: "destructive"
        });
        // No erro também redirecionamos para a página inicial
        localStorage.setItem('openTab', 'integrations');
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Processando conexão...</h1>
        <p className="text-muted-foreground">Por favor, aguarde enquanto conectamos sua conta.</p>
      </div>
    </div>
  );
}

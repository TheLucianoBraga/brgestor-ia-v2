import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('=== ERROR BOUNDARY CAUGHT ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    this.setState({ errorInfo });

    // Detectar erro de chunk/módulo dinâmico e fazer reload automático
    const isChunkError = 
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      // Marcar que estamos tentando recarregar para evitar loop infinito
      const reloadKey = 'chunk_error_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, now.toString());
        // Força um reload limpo ignorando cache
        window.location.reload();
        return;
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    // Limpar cache e recarregar
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('ChunkLoadError');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {isChunkError ? 'Atualização Disponível' : 'Ops! Algo deu errado'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isChunkError 
                ? 'Uma nova versão do sistema está disponível. Clique em recarregar para atualizar.'
                : 'Ocorreu um erro inesperado. Tente recarregar a página ou voltar para o início.'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
                <p className="text-sm font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Ir para Início
              </Button>
              {!isChunkError && (
                <Button variant="outline" onClick={this.handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
              <Button onClick={this.handleReload}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Recarregar Página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

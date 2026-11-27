import React from "react";

export class ApplicationErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("A interface encontrou um erro inesperado:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-state" role="alert">
        <section className="app-state-card">
          <h1>Não foi possível exibir esta tela</h1>
          <p>Recarregue o aplicativo. Se o problema continuar, tente novamente mais tarde.</p>
          <button type="button" className="ui-button ui-button--filled" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}

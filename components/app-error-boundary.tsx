"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitErrorReport } from "@/lib/feedback";

type State = {
  error: Error | null;
  sent: boolean;
};

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, sent: false };
  private errorInfo: ErrorInfo | null = null;

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorInfo = errorInfo;
    this.setState({ error, sent: false });
  }

  async sendReport() {
    if (!this.state.error) return;
    await submitErrorReport(this.state.error, this.errorInfo?.componentStack ?? "");
    this.setState({ sent: true });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="container grid min-h-[70svh] place-items-center py-8">
        <section className="form-card max-w-md space-y-4">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#FFF7F3] text-[#712B13]"><AlertTriangle size={22} /></span>
          <div>
            <h1 className="font-serif text-3xl">Ocurrió un problema.</h1>
            <p className="mt-2 text-sm text-[#6B6860]">Puedes enviar un reporte para ayudarnos a corregirlo.</p>
          </div>
          <Button type="button" onClick={() => this.sendReport()} disabled={this.state.sent}>{this.state.sent ? "Reporte enviado" : "Enviar reporte"}</Button>
        </section>
      </main>
    );
  }
}

/**
 * Sistema de cola de emails con reintentos automáticos
 * Previene pérdida de emails y maneja fallos de envío
 */

interface EmailJob {
  id: string;
  type: 'magic-link' | 'invite' | 'welcome' | 'approval' | 'other';
  recipient: string;
  data: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
}

class EmailQueue {
  private queue: Map<string, EmailJob> = new Map();
  private processing = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 segundos entre reintentos

  /**
   * Agregar un email a la cola
   */
  add(
    type: EmailJob['type'],
    recipient: string,
    data: any,
    maxAttempts: number = this.MAX_RETRIES
  ): string {
    const id = `${type}-${recipient}-${Date.now()}`;
    
    const job: EmailJob = {
      id,
      type,
      recipient,
      data,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      status: 'pending',
    };

    this.queue.set(id, job);
    console.log(`📧 Email agregado a cola: ${type} -> ${recipient} (ID: ${id})`);
    
    // Iniciar procesamiento si no está activo
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Procesar la cola de emails
   */
  private async processQueue() {
    if (this.processing) return;
    
    this.processing = true;

    while (this.queue.size > 0) {
      const pendingJobs = Array.from(this.queue.values()).filter(
        job => job.status === 'pending'
      );

      if (pendingJobs.length === 0) break;

      for (const job of pendingJobs) {
        await this.processJob(job);
        await this.delay(1000); // 1 segundo entre emails para no saturar
      }
    }

    this.processing = false;
  }

  /**
   * Procesar un job individual
   */
  private async processJob(job: EmailJob) {
    job.status = 'processing';
    job.attempts++;
    job.lastAttempt = new Date();

    console.log(`📤 Procesando email ${job.id} (intento ${job.attempts}/${job.maxAttempts})`);

    try {
      // Aquí se llamaría a la función de envío correspondiente
      // Por ahora solo simulamos éxito
      const success = await this.sendEmail(job);

      if (success) {
        job.status = 'sent';
        console.log(`✅ Email enviado exitosamente: ${job.id}`);
        this.queue.delete(job.id);
      } else {
        throw new Error('Email send returned false');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      job.error = errorMessage;
      
      console.error(`❌ Error enviando email ${job.id}:`, errorMessage);

      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        console.error(`💔 Email falló después de ${job.attempts} intentos: ${job.id}`);
        // No eliminar de la cola para mantener registro de fallo
      } else {
        job.status = 'pending';
        console.log(`🔄 Reintentando email ${job.id} en ${this.RETRY_DELAY}ms...`);
        await this.delay(this.RETRY_DELAY);
      }
    }
  }

  /**
   * Enviar email (placeholder - se integraría con email.ts)
   */
  private async sendEmail(job: EmailJob): Promise<boolean> {
    // Esta función sería reemplazada por llamadas reales a las funciones de email.ts
    // Por ejemplo: await sendMagicLinkEmail(job.data)
    return true;
  }

  /**
   * Helper para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtener estado de la cola
   */
  getStatus() {
    const jobs = Array.from(this.queue.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      sent: jobs.filter(j => j.status === 'sent').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      jobs: jobs.map(j => ({
        id: j.id,
        type: j.type,
        recipient: j.recipient,
        attempts: j.attempts,
        status: j.status,
        error: j.error,
        createdAt: j.createdAt,
        lastAttempt: j.lastAttempt,
      })),
    };
  }

  /**
   * Limpiar jobs completados
   */
  cleanup() {
    const sentJobs = Array.from(this.queue.values()).filter(
      job => job.status === 'sent'
    );
    
    sentJobs.forEach(job => this.queue.delete(job.id));
    
    console.log(`🧹 Limpieza: ${sentJobs.length} emails enviados eliminados de la cola`);
  }
}

// Exportar instancia singleton
export const emailQueue = new EmailQueue();

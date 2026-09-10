import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { clientEmail, clientName, invoiceNumber, dueDate, amountTTC } = await request.json();

    if (!clientEmail) {
      return NextResponse.json(
        { error: "L'adresse email du client est requise." },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'Facturation Agence <onboarding@resend.dev>', // En prod : facturation@ton-domaine.com
      to: [clientEmail],
      subject: `Rappel : Facture ${invoiceNumber} en attente de règlement`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">Bonjour ${clientName},</h2>
          
          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Sauf erreur ou omission de notre part, nous constatons que la facture 
            <strong>${invoiceNumber}</strong>, arrivée à échéance le <strong>${dueDate}</strong>, 
            n'a pas encore été réglée à ce jour.
          </p>

          <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px; margin: 24px 0; border-radius: 6px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">RÉFÉRENCE : <strong style="color: #0f172a;">${invoiceNumber}</strong></p>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">Montant total : ${amountTTC}</p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
            Nous vous remercions de bien vouloir procéder à son règlement dans les plus brefs délais par virement bancaire.
          </p>

          <p style="font-size: 14px; color: #64748b; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Si votre virement a déjà été émis, merci de ne pas tenir compte de ce rappel.<br />
            Cordialement,<br />
            <strong>Le service comptabilité</strong>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Erreur Resend:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Erreur API:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fdf8f0] to-[#fef9f5] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#fdf3e3] rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">💌</span>
        </div>
        <h1 className="text-3xl text-[#4a3728] font-light mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Invitation privée
        </h1>
        <div className="w-16 h-px bg-[#b8860b] mx-auto mb-6" />
        <p className="text-[#6b5744] leading-relaxed mb-4 font-light">
          Cette invitation est personnelle et privée. Vous avez besoin d'un lien d'invitation valide pour accéder à cette page.
        </p>
        <p className="text-[#9b8878] text-sm font-light">
          Si vous avez reçu une invitation, veuillez utiliser le lien qui vous a été envoyé personnellement.
        </p>
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-3 opacity-40">
            <div className="h-px w-12 bg-[#b8860b]" />
            <span className="text-[#b8860b] text-lg">♥</span>
            <div className="h-px w-12 bg-[#b8860b]" />
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-[#e8d8c0]/50">
          <a
            href="?admin=true"
            className="text-[#c0b090]/60 text-xs hover:text-[#9b8878] transition-colors"
          >
            Accès administrateur
          </a>
        </div>
      </div>
    </div>
  );
}

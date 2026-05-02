import React from 'react';
import { Link } from 'react-router-dom';

const LandingFooter: React.FC = () => {
  return (
    <footer className="bg-white py-16 border-t border-gray-100">
      <div className="container">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-1 lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#0B3C5D] flex items-center justify-center">
                <span className="text-white font-black text-lg">N</span>
              </div>
              <span className="text-lg font-black tracking-tight text-[#0B3C5D]">
                NAVANHULA <span className="text-[#1E5A8A]">CLOUD</span>
              </span>
            </Link>
            <p className="text-gray-500 max-w-sm">
              Gestão empresarial inteligente para negócios que buscam alta performance e controle total.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-[#0B3C5D]">Contato</h4>
            <ul className="space-y-4 text-gray-500">
              <li>comercial@navanhula.com</li>
              <li>+258 86 049 8852</li>
              <li>Maputo, Moçambique</li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-[#0B3C5D]">Links</h4>
            <ul className="space-y-4 text-gray-500">
              <li><a href="#" className="hover:text-[#1E5A8A]">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-[#1E5A8A]">Privacidade</a></li>
              <li><a href="/login" className="hover:text-[#1E5A8A]">Área do Cliente</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400 font-medium">
          <p>© 2026 NAVANHULA CLOUD. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <span>Desenvolvido por Navanhula Group</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
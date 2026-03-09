import { Zap, Github, Twitter, Linkedin, Mail } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'Fitur', href: '#features' },
    { label: 'Harga', href: '#pricing' },
    { label: 'Integrasi', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  company: [
    { label: 'Tentang Kami', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Karir', href: '#' },
    { label: 'Kontak', href: '#' },
  ],
  resources: [
    { label: 'Dokumentasi', href: '#' },
    { label: 'API Reference', href: '#' },
    { label: 'Status', href: '#' },
    { label: 'Support', href: '#' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
  ],
};

const socialLinks = [
  { icon: Github, href: 'https://github.com/nicolasandri', label: 'GitHub' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Mail, href: 'mailto:support@workgrid.id', label: 'Email' },
];

export function Footer() {
  return (
    <footer className="relative bg-[#07080c] border-t border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#0f1218]" />
              </div>
              <span className="text-xl font-bold text-white">
                Work<span className="text-cyan-400">Grid</span>
              </span>
            </a>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Platform komunikasi tim modern untuk kolaborasi yang lebih efisien dan produktif.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-semibold mb-4">Produk</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-500 hover:text-cyan-400 transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Perusahaan</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-500 hover:text-cyan-400 transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-500 hover:text-cyan-400 transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-500 hover:text-cyan-400 transition-colors text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} WorkGrid. All rights reserved.
          </p>
          <p className="text-gray-600 text-sm flex items-center gap-2">
            Made with <span className="text-cyan-400">♥</span> in Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}

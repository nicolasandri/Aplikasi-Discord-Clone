import { motion } from 'framer-motion';
import { Zap, Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react';

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
    <footer className="relative bg-[#030508] border-t border-cyan-500/10">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="col-span-2"
          >
            <a href="/" className="flex items-center gap-2 mb-4 group">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Zap className="w-6 h-6 text-[#030508]" />
              </motion.div>
              <span className="text-xl font-bold text-white">
                Work<span className="text-cyan-400">Grid</span>
              </span>
            </a>
            <p className="text-gray-500 text-sm mb-6 max-w-xs">
              Platform komunikasi tim modern untuk kolaborasi yang lebih efisien dan produktif.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/30"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="text-white font-semibold mb-4 capitalize">{category}</h4>
              <ul className="space-y-3">
                {links.map((link, linkIndex) => (
                  <motion.li
                    key={link.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: categoryIndex * 0.1 + linkIndex * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <a
                      href={link.href}
                      className="text-gray-500 hover:text-cyan-400 transition-colors text-sm inline-flex items-center gap-1 group"
                    >
                      <span className="w-0 h-px bg-cyan-400 group-hover:w-3 transition-all" />
                      {link.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-gray-600 text-sm">
            © {new Date().getFullYear()} WorkGrid. All rights reserved.
          </p>
          <p className="text-gray-600 text-sm flex items-center gap-2">
            Made with{' '}
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            </motion.span>{' '}
            in Indonesia
          </p>
        </motion.div>
      </div>
    </footer>
  );
}

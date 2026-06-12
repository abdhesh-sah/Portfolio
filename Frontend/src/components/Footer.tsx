import { Github, Linkedin, Twitter, Facebook, Instagram, Mail, Code2, Globe, Youtube, MessageCircle, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { useVisitorCount } from "#src/hooks/use-visitor-count";
import { TextHoverEffect, FooterBackgroundGradient } from "#src/components/ui/hover-footer";

const defaultFooterNavItems = [
  { name: "Home", href: "/" },
  { name: "Projects", href: "/projects" },
  { name: "Skills", href: "#skills" },
  { name: "Experience", href: "#experience" },
  { name: "Blog", href: "/blog" },
  { name: "Contact", href: "#contact" },
];



export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [location, setLocation] = useLocation();
  const { data: settings } = useSiteSettings();
  const visitorCount = useVisitorCount();

  // Build social links from settings
  const socialLinks = [
    settings?.socialGithub && { href: settings.socialGithub, icon: <Github size={20} />, label: "GitHub" },
    settings?.socialLinkedin && { href: settings.socialLinkedin, icon: <Linkedin size={20} />, label: "LinkedIn" },
    settings?.socialTwitter && { href: settings.socialTwitter, icon: <Twitter size={20} />, label: "Twitter" },
    settings?.socialInstagram && { href: settings.socialInstagram, icon: <Instagram size={20} />, label: "Instagram" },
    settings?.socialFacebook && { href: settings.socialFacebook, icon: <Facebook size={20} />, label: "Facebook" },
    settings?.socialYoutube && { href: settings.socialYoutube, icon: <Youtube size={20} />, label: "YouTube" },
    settings?.socialDiscord && { href: settings.socialDiscord, icon: <MessageCircle size={20} />, label: "Discord" },
    settings?.socialStackoverflow && { href: settings.socialStackoverflow, icon: <Globe size={20} />, label: "Stack Overflow" },
    settings?.socialDevto && { href: settings.socialDevto, icon: <Code2 size={20} />, label: "Dev.to" },
    settings?.socialMedium && { href: settings.socialMedium, icon: <Globe size={20} />, label: "Medium" },
  ].filter(Boolean) as Array<{ href: string; icon: React.ReactNode; label: string }>;

  // Contact info data
  const contactInfo = [
    settings?.socialEmail && {
      icon: <Mail size={18} className="text-[#3ca2fa]" />,
      text: settings.socialEmail,
      href: `mailto:${settings.socialEmail}`,
    },
    settings?.locationText && {
      icon: <MapPin size={18} className="text-[#3ca2fa]" />,
      text: settings.locationText,
    },
  ].filter(Boolean) as Array<{ icon: React.ReactNode; text: string; href?: string }>;

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      if (location !== "/") {
        setLocation("/");
        setTimeout(() => {
          document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setLocation(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-card/10 relative h-fit rounded-[2rem] overflow-hidden m-4 sm:m-8 mt-20 border border-border/50">
      <div className="max-w-7xl mx-auto p-8 sm:p-14 z-40 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">

          {/* Brand section */}
          <div className="flex flex-col space-y-4 lg:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="relative w-10 h-10 flex items-center justify-center bg-primary/10 rounded-xl border border-primary/30">
                <Code2 className="w-5 h-5 text-primary" />
              </div>
              <span className="text-foreground text-2xl sm:text-3xl font-bold font-display tracking-tight">
                {settings?.logoText ? (
                  <>
                    {settings.logoText.split('.')[0]}<span className="text-[#3ca2fa]">.</span>{settings.logoText.split('.')[1] || "Dev"}
                  </>
                ) : (
                  <>
                    Portfolio<span className="text-[#3ca2fa]">.</span>Dev
                  </>
                )}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {settings?.footerTagline || "Building the future, one line of code at a time."}
            </p>
            {/* Social icons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {socialLinks.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-2.5 bg-foreground/5 rounded-xl border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-foreground/60 text-sm font-black uppercase tracking-[0.2em] mb-6">Explore</h4>
            <ul className="space-y-3">
              {defaultFooterNavItems.map((item) => (
                <li key={item.name} className="relative w-fit">
                  <button
                    onClick={() => handleNavClick(item.href)}
                    className="text-muted-foreground hover:text-[#3ca2fa] transition-colors flex items-center gap-2 group text-sm sm:text-base font-medium"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links (Footer) */}
          {settings?.navbarLinks && settings.navbarLinks.length > 0 && 
           settings.navbarLinks.some(link => link.label !== "New Link" && link.label.trim() !== "") && (
            <div>
                <h4 className="text-foreground/60 text-sm font-black uppercase tracking-[0.2em] mb-6">Quick Links</h4>
              <ul className="space-y-3">
                {settings.navbarLinks
                  .filter(link => link.label !== "New Link" && link.label.trim() !== "")
                  .map((item, index) => (
                    <li key={`${item.label}-${index}`} className="relative w-fit">
                      <button
                        onClick={() => handleNavClick(item.href)}
                        className="text-muted-foreground hover:text-[#3ca2fa] transition-colors flex items-center gap-2 group text-sm sm:text-base font-medium"
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Contact section */}
          <div>
            <h4 className="text-foreground/60 text-sm font-black uppercase tracking-[0.2em] mb-6">Get in Touch</h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-muted-foreground max-w-full">
                  <div className="p-2 rounded-lg bg-foreground/5 border border-border">{item.icon}</div>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-[#3ca2fa] transition-colors text-sm sm:text-base break-words font-medium"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-sm sm:text-base font-medium">
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <button
                onClick={() => handleNavClick("#contact")}
                className="w-full py-3 px-6 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl transition-all font-bold text-sm"
              >
                Send a Message
              </button>
            </div>
          </div>
        </div>

        {/* Footer bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm pt-8 border-t border-border/50 gap-6">
          {/* Status Pill (New placement) */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
            <div className="relative flex h-2.5 w-2.5">
              <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${visitorCount.count > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`} />
              <div className={`relative rounded-full h-2.5 w-2.5 ${visitorCount.count > 0 ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">
                Live Status
              </span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">
                {visitorCount.count} Active {visitorCount.count === 1 ? 'Visitor' : 'Visitors'}
              </span>
            </div>
          </div>

          {/* Copyright (Centralized) */}
          <div className="text-center text-muted-foreground font-medium">
            <p>{settings?.footerCopyright ? settings.footerCopyright.replace('{year}', currentYear.toString()) : `© ${currentYear} ${settings?.personalName || 'Portfolio Owner'}. All rights reserved.`}</p>
          </div>

          {/* Tech Credit (Right) */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>Powered by</span>
            <span className="text-foreground/40">React & TS</span>
          </div>
        </div>
      </div>

      {/* Background Watermark Section - Strictly Clipped */}
      <div className="relative h-[20rem] sm:h-[25rem] md:h-[30rem] overflow-hidden pointer-events-none -mt-40 select-none opacity-20 transition-opacity hover:opacity-30">
        <div className="absolute inset-0 flex items-end justify-center">
          <TextHoverEffect
            text={settings?.personalName ? settings.personalName.split(' ')[0].toUpperCase() : "PORTFOLIO"}
            className="z-0 transform translate-y-1/2"
          />
        </div>
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}

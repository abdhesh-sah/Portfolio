import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageApiSchema, type InsertMessage } from "#shared";
import { useSendMessage } from "#src/hooks/use-portfolio";
import { useSiteSettings } from "#src/hooks/use-site-settings";
import { m, AnimatePresence } from "framer-motion";
import { fadeLeft, fadeDown, fadeUp, fadeRight, scaleIn } from "#src/lib/animation";
import { useState, useEffect, useRef, useCallback } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle, Terminal, Copy, Check, Paperclip, X, FileText } from "lucide-react";
import { Github, Linkedin } from "#src/components/icons/brand-icons";
import { Button } from "#src/components/ui/button";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { trackEngagementMilestone } from "#src/lib/analytics";

// Cyber Input Component
const CyberInput = ({
  id,
  label,
  type = "text",
  error,
  register,
  required,
  isTextarea = false,
  autoComplete
}: {
  id: keyof InsertMessage;
  label: string;
  type?: string;
  error?: string;
  register: UseFormRegister<InsertMessage>;
  required?: boolean;
  isTextarea?: boolean;
  autoComplete?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const Component = isTextarea ? "textarea" : "input";

  return (
    <div className="relative group">
      {/* Corner Accents */}
      <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 transition-colors duration-300 ${isFocused ? "border-cyan-400" : "border-border"}`} />
      <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 transition-colors duration-300 ${isFocused ? "border-cyan-400" : "border-border"}`} />
      <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 transition-colors duration-300 ${isFocused ? "border-cyan-400" : "border-border"}`} />
      <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 transition-colors duration-300 ${isFocused ? "border-cyan-400" : "border-border"}`} />

      <Component
        {...register(id, {
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setHasValue(e.target.value.length > 0)
        })}
        type={type}
        id={id}
        autoComplete={autoComplete}
        rows={isTextarea ? 5 : undefined}
        onFocus={() => setIsFocused(true)}
        onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          setIsFocused(false);
          setHasValue(e.target.value.length > 0);
        }}
        className={`w-full px-4 py-3 bg-card/50 border rounded-lg outline-none transition-all duration-300 font-mono text-sm ${error
          ? 'border-red-500/50 focus:border-red-500'
          : 'border-border focus:border-cyan-500/50 hover:border-foreground/20'
          } ${isFocused || hasValue ? 'pt-8 pb-2' : 'pt-5 pb-5'} placeholder-transparent text-foreground resize-none`}
      />

      <label
        htmlFor={id}
        className={`absolute left-4 transition-all duration-300 pointer-events-none font-mono uppercase tracking-wider ${isFocused || hasValue
          ? 'top-2 text-[10px] text-cyan-400'
          : 'top-4 text-xs text-muted-foreground'
          }`}
      >
        {'>'} {label} {required && <span className="text-red-400">*</span>}
      </label>

      <AnimatePresence>
        {error && (
          <m.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute right-2 top-2 text-[10px] text-red-400 font-mono bg-red-950/30 px-2 py-0.5 rounded border border-red-500/30"
          >
            ! ERROR: {error}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// Data Card
const DataCard = ({ icon: Icon, label, value, href, delay }: { icon: React.ElementType; label: string; value: string; href?: string; delay: number }) => {
  const [copied, setCopied] = useState(false);

  const handleAction = (e: React.MouseEvent) => {
    if (href && href !== "#") return; // Let links be links
    
    e.preventDefault();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <m.div
      initial={fadeLeft.initial}
      whileInView={fadeLeft.animate}
      viewport={{ once: true }}
      transition={{ delay }}
      className="group"
    >
      <a
        href={href}
        onClick={handleAction}
        className={`flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-foreground/[0.02] hover:bg-foreground/[0.05] hover:border-cyan-500/30 transition-all ${!href && 'pointer-events-none'}`}
      >
        <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-0.5">{label}</p>
          <p className="text-sm font-medium text-foreground truncate font-mono">{value}</p>
        </div>
        {copied ? (
          <Check className="w-4 h-4 text-green-400 animate-in zoom-in" />
        ) : (
          href && <Copy className="w-4 h-4 text-muted-foreground group-hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100" aria-hidden="true" />
        )}
      </a>
    </m.div>
  );
};

export default function Contact() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [messageFocused, setMessageFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: sendMessage, isPending, error: apiError } = useSendMessage();
  const { data: settings } = useSiteSettings();


  // Auto-dismiss success message
  const dismissSuccess = () => setShowSuccess(false);
  const form = useForm<InsertMessage>({
    resolver: zodResolver(insertMessageApiSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      projectType: "",
      budget: "",
      timeline: "",
    },
  });


  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTENSIONS = [
    ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif",
    ".doc", ".docx", ".txt", ".rtf",
    ".xls", ".xlsx", ".csv",
    ".zip", ".rar", ".7z",
    ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".py", ".go", ".rs", ".cpp", ".c", ".h", ".cs", ".java", ".sh", ".md", ".yaml", ".yml", ".xml"
  ];

  const validateAndSetFile = useCallback((file: File | null) => {
    setFileError(null);
    if (!file) { setAttachment(null); return; }
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError("Invalid type. Allowed: PDF, Images, Documents, Spreadsheets, Archives, Source Code.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`);
      return;
    }
    setAttachment(file);
  }, []);

  const onSubmit = (data: InsertMessage) => {
    if (cooldown > 0) return;
    sendMessage({ data, attachment }, {
      onSuccess: () => {
        form.reset();
        setAttachment(null);
        setFileError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setShowSuccess(true);
        setCooldown(60); // 60 seconds cooldown
        // ── Engagement Milestone: visitor successfully sent a message ──
        //    Clarity filter: LeadIntent = "clicked_contact"
        trackEngagementMilestone("clicked_contact");
      },
    });
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  return (
    <section id="contact" className="section-container relative overflow-hidden py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <m.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-mono mb-4"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            COMM_LINK_OPEN
          </m.div>

          <m.h2
            initial={fadeDown.initial}
            whileInView={fadeDown.animate}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4"
          >
            {settings?.contactHeading || (
              <>
                Initialize <span className="text-cyan-400">Connection</span>
              </>
            )}
          </m.h2>

          <p className="text-muted-foreground max-w-lg mx-auto">
            Ready to collaborate on high-performance systems? Transmit your data below.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Contact Info Panel */}
          <div className="lg:col-span-2 space-y-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md border border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Terminal className="w-24 h-24 text-cyan-500" />
              </div>

              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-cyan-500 rounded-full" />
                Direct Channels
              </h3>

              <div className="space-y-4 relative z-10">
                <DataCard icon={Mail} label="Email Protocol" value={settings?.socialEmail || "your.email@example.com"} href={settings?.socialEmail ? `mailto:${settings.socialEmail}?subject=Project%20Inquiry` : "#"} delay={0.1} />
                <DataCard icon={MapPin} label="Base Location" value={settings?.locationText || "Remote / Worldwide"} href="#" delay={0.2} />
                <DataCard icon={Phone} label="Signal Freq" value={settings?.personalPhone || "+000 0000000"} href={settings?.personalPhone ? `tel:${settings.personalPhone}` : "#"} delay={0.3} />
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md border border-primary/20">
              <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                <div className="w-1 h-6 bg-purple-500 rounded-full" />
                Social Uplink
              </h3>
              <div className="flex gap-4">
                {settings?.socialGithub && <SocialLink href={settings.socialGithub} icon={Github} label="GitHub" delay={0.4} />}
                {settings?.socialLinkedin && <SocialLink href={settings.socialLinkedin} icon={Linkedin} label="LinkedIn" delay={0.5} />}
              </div>
            </div>

            {/* Availability Block */}
            <m.div
              initial={fadeUp.initial}
              whileInView={fadeUp.animate}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-md border border-primary/20"
            >
              <AvailabilityCalendar />
            </m.div>
          </div>

          {/* Form Terminal */}
          <m.div
            initial={fadeRight.initial}
            whileInView={fadeRight.animate}
            viewport={{ once: true }}
            className="lg:col-span-3 relative"
          >
            {/* Terminal Frame */}
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-xl rounded-2xl border border-primary/20 p-1 shadow-2xl">
              {/* Header Bar */}
              <div className="bg-foreground/5 px-4 py-2 rounded-t-xl flex items-center justify-between border-b border-border/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  contact_terminal.exe
                </div>
              </div>

              <div className="p-6 md:p-8 relative">
                <AnimatePresence>
                  {showSuccess ? (
                    <m.div
                      key="success"
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      role="status"
                      aria-live="polite"
                      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 rounded-b-xl"
                    >
                      <m.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.15, damping: 12 }}
                        className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                      >
                        <CheckCircle className="w-10 h-10 text-green-500" />
                      </m.div>
                      <h3 className="text-2xl font-bold text-foreground mb-2">Transmission Successful</h3>
                      <p className="text-muted-foreground mb-4 font-mono text-sm">Target received packet. Awaiting response.</p>
                      <div className="w-48 h-1 bg-foreground/10 rounded-full overflow-hidden mb-6">
                        <m.div
                          initial={{ width: "100%" }}
                          animate={{ width: "0%" }}
                          transition={{ duration: 8, ease: "linear" }}
                          className="h-full bg-green-500/50 rounded-full"
                        />
                      </div>
                      <Button onClick={dismissSuccess} variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                        Send Another Packet
                      </Button>
                    </m.div>
                  ) : null}
                </AnimatePresence>

                <m.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Mode Toggles */}
                    <div className="flex gap-4 mb-8">
                      <button
                        type="button"
                        onClick={() => form.setValue("subject", "Quick Message")}
                        className={`flex-1 py-3 px-4 rounded-xl border font-mono text-[10px] uppercase tracking-widest transition-all ${
                          form.watch("subject") !== "Project Request"
                            ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "bg-foreground/5 border-border text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
                        Quick Message
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue("subject", "Project Request")}
                        className={`flex-1 py-3 px-4 rounded-xl border font-mono text-[10px] uppercase tracking-widest transition-all ${
                          form.watch("subject") === "Project Request"
                            ? "bg-purple-500/10 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                            : "bg-foreground/5 border-border text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
                        Project Request
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <CyberInput id="name" label="Identity" autoComplete="name" register={form.register} error={form.formState.errors.name?.message} required />
                      <CyberInput id="email" label="Return Address" type="email" autoComplete="email" register={form.register} error={form.formState.errors.email?.message} required />
                    </div>

                    <AnimatePresence mode="popLayout">
                      {form.watch("subject") === "Project Request" ? (
                        <m.div
                          key="project-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid md:grid-cols-2 gap-6 overflow-hidden"
                        >
                          <CyberInput id="projectType" label="Project Type" register={form.register} error={form.formState.errors.projectType?.message} />
                          <CyberInput id="budget" label="Est. Budget" register={form.register} error={form.formState.errors.budget?.message} />
                          <div className="md:col-span-2">
                            <CyberInput id="timeline" label="Timeline" register={form.register} error={form.formState.errors.timeline?.message} />
                          </div>
                        </m.div>
                      ) : (
                        <m.div
                          key="message-fields"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <CyberInput id="subject" label="Header / Subject" autoComplete="subject" register={form.register} error={form.formState.errors.subject?.message} required />
                        </m.div>
                      )}
                    </AnimatePresence>

                    <div className="relative group">
                      {/* Corner Accents */}
                      <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 transition-colors duration-300 ${messageFocused || isDragging ? "border-cyan-400" : "border-border"}`} />
                      <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 transition-colors duration-300 ${messageFocused || isDragging ? "border-cyan-400" : "border-border"}`} />
                      <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 transition-colors duration-300 ${messageFocused || isDragging ? "border-cyan-400" : "border-border"}`} />
                      <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 transition-colors duration-300 ${messageFocused || isDragging ? "border-cyan-400" : "border-border"}`} />

                      <textarea
                        {...form.register("message")}
                        id="message"
                        rows={6}
                        onFocus={() => setMessageFocused(true)}
                        onBlur={() => setMessageFocused(false)}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files?.[0] || null); }}
                        className={`w-full px-4 pt-6 pb-14 bg-card/50 border rounded-lg outline-none transition-all duration-300 font-mono text-sm ${
                          isDragging
                            ? 'border-cyan-400 bg-cyan-500/5 ring-1 ring-cyan-500/20'
                            : form.formState.errors.message
                              ? 'border-red-500/50 focus:border-red-500'
                              : 'border-border focus:border-cyan-500/50 hover:border-foreground/20'
                        } placeholder-transparent text-foreground resize-none`}
                      />

                      <label
                        htmlFor="message"
                        className={`absolute left-4 transition-all duration-300 pointer-events-none font-mono uppercase tracking-wider ${
                          messageFocused || form.watch("message") || isDragging
                            ? 'top-2 text-[10px] text-cyan-400'
                            : 'top-4 text-xs text-muted-foreground'
                        }`}
                      >
                        {'>'} Packet Payload <span className="text-red-400">*</span>
                      </label>

                      {/* File Uploader absolute icon in bottom right */}
                      <div className="absolute right-3 bottom-3 flex items-center gap-2 z-10">
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.avif,.doc,.docx,.txt,.rtf,.xls,.xlsx,.csv,.zip,.rar,.7z,.js,.jsx,.ts,.tsx,.html,.css,.json,.py,.go,.rs,.cpp,.c,.h,.cs,.java,.sh,.md,.yaml,.yml,.xml"
                          className="hidden"
                          onChange={(e) => validateAndSetFile(e.target.files?.[0] || null)}
                        />

                        {attachment ? (
                          <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-lg text-xs font-mono text-cyan-400 max-w-[220px] sm:max-w-xs animate-in fade-in zoom-in-95">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{attachment.name}</span>
                            <span className="text-[9px] text-cyan-400/60 shrink-0">({(attachment.size / 1024 / 1024).toFixed(1)}MB)</span>
                            <button
                              type="button"
                              onClick={() => { setAttachment(null); setFileError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                              className="p-0.5 rounded hover:bg-cyan-500/20 text-cyan-400 hover:text-red-400 transition-colors shrink-0"
                              aria-label="Remove attachment"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`p-2 rounded-lg border transition-all duration-300 flex items-center justify-center ${
                              isDragging
                                ? "bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)] animate-pulse"
                                : "bg-foreground/5 border-border hover:border-cyan-500/50 text-muted-foreground hover:text-cyan-400"
                            }`}
                            title="Attach File (PDF, Image - Max 5MB)"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <AnimatePresence>
                        {form.formState.errors.message?.message && (
                          <m.p
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="absolute right-2 top-2 text-[10px] text-red-400 font-mono bg-red-950/30 px-2 py-0.5 rounded border border-red-500/30"
                          >
                            ! ERROR: {form.formState.errors.message.message}
                          </m.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {fileError && (
                        <m.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="text-[10px] text-red-400 font-mono bg-red-950/30 px-2 py-1 rounded border border-red-500/30 inline-block w-full text-center"
                        >
                          ! ATTACHMENT ERROR: {fileError}
                        </m.p>
                      )}
                    </AnimatePresence>
                    {/* Honeypot field for spam protection */}
                    <div className="absolute left-[-9999px] opacity-0" aria-hidden="true">
                      <input type="text" tabIndex={-1} autoComplete="off" {...form.register("_bnt_id" as keyof InsertMessage)} />
                    </div>

                    {apiError && (
                      <div role="alert" aria-live="assertive" className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono flex items-start gap-2">
                        <span className="shrink-0 mt-0.5">! ERROR:</span>
                        <span>
                          {apiError instanceof Error && apiError.message.includes("429")
                            ? "Too many messages sent. Please wait 15 minutes before trying again."
                            : apiError instanceof Error 
                              ? apiError.message 
                              : "Transmission failed. Try again."}
                        </span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isPending || cooldown > 0}
                      className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono uppercase tracking-widest rounded-lg relative overflow-hidden group"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin text-lg">/</span> UPLOADING...
                        </span>
                      ) : cooldown > 0 ? (
                        <span className="flex items-center gap-2 text-xs sm:text-sm">
                          TRANSMISSION_COOLDOWN [{cooldown}s]
                        </span>
                      ) : (
                        <span className="relative z-10 flex items-center gap-2 group-hover:gap-4 transition-all text-xs sm:text-sm">
                          INITIATE_TRANSMISSION <Send className="w-4 h-4" />
                        </span>
                      )}

                      <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                    </Button>
                  </form>
                </m.div>
              </div>

              {/* Footer Bar */}
              <div className="bg-foreground/5 px-4 py-2 rounded-b-xl border-t border-border/50 flex justify-between items-center text-[10px] font-mono text-muted-foreground">
                <span>SECURE_CONNECTION: TLS_v1.3</span>
                <span>LATENCY: 12ms</span>
              </div>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  );
}

const SocialLink = ({ href, icon: Icon, label, delay }: { href: string; icon: React.ElementType; label: string; delay: number }) => (
  <m.a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    initial={scaleIn.initial}
    whileInView={scaleIn.animate}
    viewport={{ once: true }}
    transition={{ delay }}
    whileHover={{ scale: 1.05 }}
    className="p-3 bg-foreground/5 hover:bg-foreground/10 border border-border hover:border-cyan-500/30 rounded-lg text-muted-foreground hover:text-cyan-400 transition-all"
    title={label}
    aria-label={label}
  >
    <Icon className="w-5 h-5" />
  </m.a>
);

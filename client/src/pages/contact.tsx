import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Mail, MessageSquare, Send, Twitter, Linkedin, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';

export const ContactPage: React.FC = () => {
  useSEO({
    title: 'Contact - Get in Touch',
    description: 'Have questions about LLM.txt Mastery? Contact us for support, feedback, or partnership inquiries.',
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show a success message
    // In production, this would send to an API endpoint
    toast.success("Message sent! I'll get back to you soon.");
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-cloud">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Let's Connect</h1>
          <p className="text-xl text-slate-brand">
            Have a question, feedback, or just want to say hi? I'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-3 text-signal-blue" />
                  Send a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Name
                      </label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <Input
                      id="subject"
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      placeholder="What's this about?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      placeholder="Your message..."
                      rows={6}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Send className="mr-2" size={16} />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            {/* Direct Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="mr-3 text-signal-blue" />
                  Direct Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-ink mb-4">For quick questions or feedback:</p>
                <a href="mailto:support@llmtxtmastery.com" className="text-signal-blue hover:underline">
                  support@llmtxtmastery.com
                </a>
              </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
              <CardHeader>
                <CardTitle>Connect on Social</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <a
                    href="https://jamiewatters.work"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-ink hover:text-mastery-blue transition-colors"
                  >
                    <ExternalLink className="mr-3" size={20} />
                    Build in Public
                  </a>
                  <a
                    href="https://twitter.com/Jamie_within"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-ink hover:text-mastery-blue transition-colors"
                  >
                    <Twitter className="mr-3" size={20} />
                    @Jamie_within
                  </a>
                  <a
                    href="https://linkedin.com/in/jamie-watters-solo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-ink hover:text-mastery-blue transition-colors"
                  >
                    <Linkedin className="mr-3" size={20} />
                    LinkedIn
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-cloud border-mist">
              <CardContent className="pt-6">
                <p className="text-sm text-ink">
                  <strong>Response Time:</strong> I personally read and respond to every message.
                  Expect a reply within 24-48 hours.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Why Contact Section */}
        <Card className="mt-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-4">Why Reach Out?</h2>
            <div className="grid md:grid-cols-3 gap-6 text-ink">
              <div>
                <h3 className="font-semibold mb-2">🐛 Report Issues</h3>
                <p className="text-sm">
                  Found a bug or something not working? Let me know and I'll fix it ASAP.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">💡 Feature Requests</h3>
                <p className="text-sm">
                  Have an idea that would make the tool better? I'd love to hear it.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">👋 Just Say Hi</h3>
                <p className="text-sm">
                  Sometimes it's nice to connect with fellow builders. Drop me a line!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center mt-12 text-slate-brand">
          <p>No corporate support tickets. No automated responses.</p>
          <p className="mt-2">Just direct communication with the person who built this.</p>
        </div>
      </div>
    </div>
  );
};

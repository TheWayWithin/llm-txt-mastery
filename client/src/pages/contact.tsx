import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Mail, MessageSquare, Send, Twitter, Linkedin, Github } from 'lucide-react';
import { toast } from 'sonner';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show a success message
    // In production, this would send to an API endpoint
    toast.success('Message sent! I\'ll get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Let's Connect
          </h1>
          <p className="text-xl text-gray-600">
            Have a question, feedback, or just want to say hi? I'd love to hear from you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-3 text-blue-600" />
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
                  <Mail className="mr-3 text-purple-600" />
                  Direct Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  For quick questions or feedback:
                </p>
                <a 
                  href="mailto:jamie@llmtxtmastery.com" 
                  className="text-blue-600 hover:underline"
                >
                  jamie@llmtxtmastery.com
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
                    href="https://twitter.com/jamiewatters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <Twitter className="mr-3" size={20} />
                    @jamiewatters
                  </a>
                  <a
                    href="https://linkedin.com/in/jamiewatters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <Linkedin className="mr-3" size={20} />
                    LinkedIn
                  </a>
                  <a
                    href="https://github.com/jamiewatters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <Github className="mr-3" size={20} />
                    GitHub
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <p className="text-sm text-gray-700">
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
            <div className="grid md:grid-cols-3 gap-6 text-gray-700">
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
        <div className="text-center mt-12 text-gray-600">
          <p>
            No corporate support tickets. No automated responses.
          </p>
          <p className="mt-2">
            Just direct communication with the person who built this.
          </p>
        </div>
      </div>
    </div>
  );
};
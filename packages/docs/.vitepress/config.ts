import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kubidu Docs',
  description: 'Deploy with confidence. Stay compliant.',
  
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#16A34A' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Kubidu Docs' }],
    ['meta', { property: 'og:description', content: 'Deploy with confidence. Stay compliant.' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Kubidu',
    
    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'CLI', link: '/cli/' },
      { text: 'API', link: '/api/' },
      { text: 'Dashboard', link: 'https://app.kubidu.io' }
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Quickstart', link: '/getting-started/quickstart' },
            { text: 'Installation', link: '/getting-started/installation' }
          ]
        },
        {
          text: 'Deployments',
          items: [
            { text: 'Overview', link: '/deployments/' },
            { text: 'Docker', link: '/deployments/docker' },
            { text: 'GitHub Integration', link: '/deployments/github' },
            { text: 'Rollbacks', link: '/deployments/rollbacks' },
            { text: 'Logs', link: '/deployments/logs' }
          ]
        },
        {
          text: 'Configuration',
          items: [
            { text: 'Overview', link: '/configuration/' },
            { text: 'Environment Variables', link: '/configuration/environment-variables' },
            { text: 'Custom Domains', link: '/configuration/domains' },
            { text: 'Auto-Scaling', link: '/configuration/scaling' },
            { text: 'Resource Limits', link: '/configuration/resources' }
          ]
        },
        {
          text: 'Teams & Workspaces',
          items: [
            { text: 'Overview', link: '/teams/' },
            { text: 'Workspaces', link: '/teams/workspaces' },
            { text: 'Team Members', link: '/teams/members' },
            { text: 'Permissions', link: '/teams/permissions' }
          ]
        },
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'Commands', link: '/cli/commands' },
            { text: 'Configuration', link: '/cli/configuration' }
          ]
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Endpoints', link: '/api/reference' }
          ]
        },
        {
          text: 'Compliance',
          items: [
            { text: 'GDPR', link: '/compliance/gdpr' },
            { text: 'ISO 27001', link: '/compliance/iso27001' },
            { text: 'Data Security', link: '/compliance/data-security' }
          ]
        },
        {
          text: 'Billing',
          items: [
            { text: 'Plans', link: '/billing/plans' },
            { text: 'Usage', link: '/billing/usage' }
          ]
        },
        {
          text: 'Support',
          items: [
            { text: 'FAQ', link: '/support/faq' },
            { text: 'Troubleshooting', link: '/support/troubleshooting' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kubidu' }
    ],

    footer: {
      message: 'Powered by 100% renewable energy 🌱',
      copyright: '© 2026 Kubidu GmbH. All rights reserved.'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/kubidu/kubidu/edit/main/packages/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },

  markdown: {
    lineNumbers: true
  }
})

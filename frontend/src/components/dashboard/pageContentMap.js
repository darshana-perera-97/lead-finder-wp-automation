const pageContentMap = {
  dashboard: {
    heading: 'Dashboard',
    description: 'A minimal overview of your activity.',
    cards: [
      { title: 'Leads this week', pill: 'Updated', body: 'Track new leads added to your pipeline.', span: 4 },
      { title: 'Conversion rate', pill: 'Trend', body: 'Monitor how often leads turn into conversations.', span: 4 },
      { title: 'New messages', pill: 'Today', body: 'See inbox activity and response speed.', span: 4 },
    ],
    tableLabel: 'Quick actions',
  },
  leads: {
    heading: 'leads',
    description: 'Organize and qualify leads efficiently.',
    cards: [
      { title: 'Pipeline stages', pill: 'Live', body: 'Review lead movement across stages.', span: 6 },
      { title: 'Segments', pill: 'Filters', body: 'Group leads by source, industry, or intent.', span: 6 },
      { title: 'Import leads', pill: 'CSV/Sheets', body: 'Bring in new leads in seconds.', span: 4 },
    ],
    tableLabel: 'Lead preview',
  },
  messages: {
    heading: 'Messages',
    description: 'Keep conversations clean and fast.',
    cards: [
      { title: 'Inbox', pill: 'Unread', body: 'Manage new inbound messages in one place.', span: 6 },
      { title: 'Templates', pill: 'Reusable', body: 'Save message formats for consistent outreach.', span: 6 },
      { title: 'Response speed', pill: 'SLA', body: 'Measure time-to-first-reply.', span: 4 },
    ],
    tableLabel: 'Conversation list',
  },
  camaigns: {
    heading: 'camaigns',
    description: 'Plan, run, and evaluate outreach campaigns.',
    cards: [
      { title: 'Active campaigns', pill: 'Running', body: 'See which campaigns are currently live.', span: 6 },
      { title: 'Create campaign', pill: 'New', body: 'Start a new campaign from a template.', span: 6 },
      { title: 'Performance', pill: 'Analytics', body: 'Track opens, clicks, and conversions.', span: 4 },
    ],
    tableLabel: 'Campaign analytics',
  },
  Settngs: {
    heading: 'Settngs',
    description: 'Customize your workspace preferences.',
    cards: [
      { title: 'Profile', pill: 'Account', body: 'Update user details and notifications.', span: 6 },
      { title: 'Preferences', pill: 'UI', body: 'Control defaults and dashboard behavior.', span: 6 },
      { title: 'API access', pill: 'Security', body: 'Manage keys and integration permissions.', span: 4 },
    ],
    tableLabel: 'Settings summary',
  },
  intergrations: {
    heading: 'intergrations',
    description: 'Connect tools to automate your workflow.',
    cards: [
      { title: 'WordPress', pill: 'Connector', body: 'Sync content and lead data.', span: 6 },
      { title: 'Google Sheets', pill: 'Sync', body: 'Import/export leads via Sheets.', span: 6 },
      { title: 'Webhooks', pill: 'Events', body: 'Receive updates from external services.', span: 4 },
    ],
    tableLabel: 'Integration status',
  },
};

export default pageContentMap;


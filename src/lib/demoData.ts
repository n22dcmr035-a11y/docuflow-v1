import type { Document } from '@/types';

export const DEMO_DOCS: Document[] = [
  {
    id: 'demo-1',
    user_id: 'demo',
    title: 'The Great Gatsby',
    file_name: 'gatsby.docx',
    file_type: 'docx',
    storage_path: '',
    parsed_html: `
      <h1>The Great Gatsby</h1>
      <h2>Chapter 1</h2>
      <p>In my younger and more vulnerable years my father gave me some advice that I’ve been turning over in my mind ever since.</p>
      <p>"Whenever you feel like criticizing any one," he told me, "just remember that all the people in this world haven’t had the advantages that you’ve had."</p>
      <p>He didn’t say any more, but we’ve always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I’m inclined to reserve all judgments, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores.</p>
      <p>The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men. Most of the confidences were unsought—frequently I have feigned sleep, preoccupation, or a hostile levity when I realized by some unmistakable sign that an intimate revelation was quivering on the horizon; for the intimate revelations of young men, or at least the terms in which they express them, are usually plagiaristic and marred by obvious suppressions.</p>
      <p>Reserving judgments is a matter of infinite hope. I am still a little afraid of missing something if I forget that, as my father snobbishly suggested, and I snobbishly repeat, a sense of the fundamental decencies is parcelled out unequally at birth.</p>
      <p>And, after boasting this way of my tolerance, I come to the admission that it has a limit. Conduct may be founded on the hard rock or the wet marshes, but after a certain point I don’t care what it’s founded on. When I came back from the East last autumn I felt that I wanted the world to be in uniform and at a sort of moral attention forever; I wanted no more riotous excursions with privileged glimpses into the human heart. Only Gatsby, the man who gives his name to this book, was exempt from my reaction—Gatsby, who represented everything for which I have an unaffected scorn.</p>
    `,
    word_count: 47094,
    cover_color: '#b5d5e0',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    scroll_pct: 62,
    last_read: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-2',
    user_id: 'demo',
    title: 'Design Patterns: Elements of Reusable Software',
    file_name: 'design-patterns.pdf',
    file_type: 'pdf',
    storage_path: '',
    parsed_html: null,
    word_count: 120000,
    cover_color: '#d4e0b5',
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    scroll_pct: 28,
    last_read: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'demo-3',
    user_id: 'demo',
    title: 'Atomic Habits',
    file_name: 'atomic-habits.docx',
    file_type: 'docx',
    storage_path: '',
    parsed_html: `
      <h1>Atomic Habits</h1>
      <h2>The Surprising Power of Atomic Habits</h2>
      <p>The fate of British Cycling changed one day in 2003. The organization, which was the governing body for professional cycling in Great Britain, had recently hired Dave Brailsford as its new performance director. At the time, professional cyclists in Great Britain had endured nearly one hundred years of mediocrity. Since 1908, British riders had won just a single gold medal at the Olympic Games, and they had fared even worse in cycling's biggest race, the Tour de France. In 110 years, no British cyclist had ever won the event.</p>
      <p>In fact, the performance of British riders had been so underwhelming that one of the top bike manufacturers in Europe refused to sell bikes to the team because they were afraid that it would hurt sales if other professionals saw the Brits using their gear.</p>
      <p>Brailsford had been hired to put British Cycling on a new trajectory. What made him different from previous coaches was his relentless commitment to a strategy that he referred to as "the aggregation of marginal gains," which was the philosophy of searching for a tiny margin of improvement in everything you do.</p>
      <p>Brailsford said, "The whole principle came from the idea that if you broke down everything you could think of that goes into riding a bike, and then improve it by 1 percent, you will get a significant increase when you put them all together."</p>
      <blockquote><p>Habits are the compound interest of self-improvement. The same way that money multiplies through compound interest, the effects of your habits multiply as you repeat them. They seem to make little difference on any given day and yet the impact they deliver over the months and years can be enormous. It is only when looking back two, five, or perhaps ten years later that the value of good habits and the cost of bad ones becomes strikingly apparent.</p></blockquote>
      <p>It is so easy to overestimate the importance of one defining moment and underestimate the value of making small improvements on a daily basis. Too often, we convince ourselves that massive success requires massive action. Whether it is losing weight, building a business, writing a book, winning a championship, or achieving any other goal, we put pressure on ourselves to make some earth-shattering improvement that everyone will talk about.</p>
      <p>Meanwhile, improving by 1 percent isn't particularly notable—sometimes it isn't even noticeable—but it can be far more meaningful, especially in the long run. The difference a tiny improvement can make over time is astounding. Here's how the math works out: if you can get 1 percent better each day for one year, you'll end up thirty-seven times better by the time you're done. Conversely, if you get 1 percent worse each day for one year, you'll decline nearly down to zero. What starts as a small win or a minor setback accumulates into something much more.</p>
    `,
    word_count: 67000,
    cover_color: '#e0c9b5',
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    scroll_pct: 100,
    last_read: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'demo-4',
    user_id: 'demo',
    title: 'Clean Code',
    file_name: 'clean-code.pdf',
    file_type: 'pdf',
    storage_path: '',
    parsed_html: null,
    word_count: 88000,
    cover_color: '#d5b5e0',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    scroll_pct: 0,
    last_read: undefined,
  },
  {
    id: 'demo-5',
    user_id: 'demo',
    title: 'The Pragmatic Programmer',
    file_name: 'pragmatic-programmer.docx',
    file_type: 'docx',
    storage_path: '',
    parsed_html: `
      <h1>The Pragmatic Programmer</h1>
      <h2>A Cat Ate My Source Code</h2>
      <p>Programming is a craft. At its simplest, it comes down to getting a computer to do what you want it to do (or what your user wants it to do). As a programmer, you are part listener, part advisor, part interpreter, and part dictator. You try to capture elusive requirements and find a way of expressing them so that a mere machine can do them justice.</p>
      <p>You try to document your work so that others can understand it, and you try to engineer your work so that others can build on it. What's more, you try to do all this against the relentless ticking of the project clock. You work small miracles every day.</p>
      <p>It's a difficult job. There are many pitfalls waiting to trap the unwary, and many blind alleys leading to wasted time. The Pragmatic Programmer cuts through the increasing specialization and technicalities of modern software development to examine the core process—taking a requirement and producing working, maintainable code that delights its users.</p>
      <p>One of the cornerstones of the pragmatic philosophy is taking responsibility for yourself and your actions in terms of your career advancement, your project's success, and your day-to-day work. A Pragmatic Programmer takes charge of their own career, and isn't afraid to admit ignorance or error.</p>
    `,
    word_count: 95000,
    cover_color: '#b5e0d4',
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    scroll_pct: 15,
    last_read: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

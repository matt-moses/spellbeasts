import { h, fill } from './dom.js';
import { LESSONS, lessonById, showExample, quizFor } from '../logic/spells.js';
import { spellMasterSvg } from '../assets/spellmaster.js';

export const SPELL_MASTER_TAGLINE = 'A magician never reveals his secrets! But this Spell Master does!';

const owl = (size, cls = 'owl') => h('span', { class: cls, html: spellMasterSvg({ size }) });
const piece = ([text, flag]) => (flag === 'cut' ? h('s', { class: 'cut' }, text) : flag === 'hl' ? h('b', { class: 'hl' }, text) : text);
const pieces = (list) => list.map(piece);
const plain = (list) => list.map(([t]) => t).join('');

function listView(app) {
  return h('section', { class: 'screen learn' },
    h('div', { class: 'master' }, owl(120),
      h('div', { class: 'bubble master-says' }, h('h1', {}, 'Spell Master’s Secrets'), h('p', {}, SPELL_MASTER_TAGLINE))),
    h('ol', { class: 'lessons' }, LESSONS.map((l, i) =>
      h('li', {}, h('button', { type: 'button', class: 'lesson-card', id: `lesson-${l.id}`, onclick: () => app.go(`/learn/${l.id}`) },
        h('span', { class: 'num' }, String(i + 1)), h('span', { class: 'lesson-text' }, h('strong', {}, l.title), h('small', {}, l.blurb)))))),
    h('button', { class: 'secondary', onclick: () => app.go('/home') }, 'Back to home'));
}

function exampleCard(app, kind, ex) {
  const { terms, result } = showExample(kind, ex);
  const spoken = terms ? `${terms.map(plain).join(' plus ')} makes ${ex.word}` : ex.word;
  return h('li', {}, h('button', { type: 'button', class: 'example', 'aria-label': `${spoken}. Tap to hear ${ex.word}`, onclick: () => app.speaker.speak(ex.word) },
    terms ? h('span', { class: 'eq' }, terms.flatMap((t, i) => [i ? h('span', { class: 'plus', 'aria-hidden': 'true' }, '+') : null, h('span', { class: 'term' }, pieces(t))]), h('span', { class: 'plus', 'aria-hidden': 'true' }, '=')) : null,
    h('span', { class: 'result' }, pieces(result)),
    ex.wrong ? h('small', { class: 'not' }, 'not ', h('s', {}, ex.wrong)) : null));
}

function quizView(app, lesson, close) {
  const questions = quizFor(lesson);
  const box = h('div', { class: 'quiz panel', id: 'quiz' });
  let at = 0, right = 0;
  function ask() {
    if (at >= questions.length) {
      fill(box, h('h2', {}, 'Nicely done!'),
        h('p', { id: 'quiz-score', class: 'bubble' }, `You found ${right} of ${questions.length} secrets.`),
        h('button', { class: 'secondary', onclick: () => ask.restart() }, 'Try again'), ' ',
        h('button', { class: 'primary', onclick: close }, 'Back to the lesson'));
      return;
    }
    const q = questions[at];
    const out = h('div', { class: 'quiz-out', role: 'status' });
    const choose = (word, btn) => {
      const ok = word === q.word;
      if (ok) right += 1;
      box.querySelectorAll('.choice').forEach((b) => { b.disabled = true; if (b.dataset.word === q.word) b.classList.add('right'); });
      if (!ok) btn.classList.add('miss');
      fill(out, h('p', { class: ok ? 'yes' : 'almost' }, ok ? 'Yes! ' : 'Not quite. ', h('strong', {}, q.word), '. ', q.rule),
        h('button', { class: 'primary', id: 'quiz-next', onclick: () => { at += 1; ask(); } }, at + 1 < questions.length ? 'Next' : 'Finish'));
      app.speaker.speak(q.word);
    };
    fill(box, h('p', { class: 'small' }, `Question ${at + 1} of ${questions.length}`), h('h2', {}, 'Which one is spelled right?'),
      h('div', { class: 'choices' }, q.options.map((w) => h('button', { type: 'button', class: 'choice', 'data-word': w, onclick: (e) => choose(w, e.currentTarget) }, w))), out);
    box.querySelector('.choice')?.focus();
  }
  ask.restart = () => { at = 0; right = 0; ask(); };
  ask();
  return box;
}

function lessonView(app, lesson) {
  const i = LESSONS.indexOf(lesson), next = LESSONS[i + 1];
  const area = h('div', { class: 'lesson-body' });
  const showLesson = () => fill(area,
    lesson.groups.map((g) => h('div', { class: 'panel group', 'data-kind': g.kind },
      h('h2', {}, g.heading), h('p', {}, g.rule),
      h('ul', { class: 'examples' }, g.examples.map((ex) => exampleCard(app, g.kind, ex))))),
    lesson.note ? h('p', { class: 'bubble' }, lesson.note) : null,
    h('p', { class: 'small' }, 'Tap a word to hear it.'),
    h('div', { class: 'actions' },
      h('button', { class: 'primary', id: 'start-quiz', onclick: () => { fill(area, quizView(app, lesson, showLesson)); } }, 'Check yourself'),
      next ? h('button', { class: 'secondary', id: 'next-lesson', onclick: () => app.go(`/learn/${next.id}`) }, 'Next secret') : null,
      h('button', { class: 'secondary', onclick: () => app.go('/learn') }, 'All secrets')));
  showLesson();
  return h('section', { class: 'screen learn lesson' },
    h('div', { class: 'master small-master' }, owl(76), h('h1', {}, lesson.title)),
    area);
}

export function learnView(app, id) {
  const lesson = id ? lessonById(id) : null;
  return lesson ? lessonView(app, lesson) : listView(app);
}

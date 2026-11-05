// Sample list: everyday words with definitions and sentences written for this project.
export const SAMPLE_LIST_ID = 'sample';
export const SAMPLE_LIST_NAME = 'Sample words';
export const SAMPLE_WORDS = [
  ['garden', 'noun', 'A piece of ground where flowers or vegetables are grown.', 'We planted tomatoes in the garden.'],
  ['rainbow', 'noun', 'An arc of colors seen in the sky when sun shines through rain.', 'A rainbow appeared after the storm.'],
  ['whisper', 'verb', 'To speak very softly so only people close by can hear.', 'Please whisper in the library.'],
  ['island', 'noun', 'A piece of land completely surrounded by water.', 'The island was only reachable by boat.'],
  ['library', 'noun', 'A place where books are kept to be read or borrowed.', 'She borrowed three books from the library.'],
  ['Monday', 'noun', 'The day of the week after Sunday.', 'Our spelling test is on Monday.'],
  ['February', 'noun', 'The second month of the year.', 'February is the shortest month.'],
  ['thunder', 'noun', 'The loud rumbling sound that follows lightning.', 'The thunder made the dog hide under the bed.'],
  ['bicycle', 'noun', 'A vehicle with two wheels that you ride by pedaling.', 'He rides his bicycle to school.'],
  ['mountain', 'noun', 'A very high hill, often with a pointed top.', 'Snow covered the top of the mountain.'],
  ['kitchen', 'noun', 'A room where food is cooked.', 'Dinner smelled wonderful in the kitchen.'],
  ['Canada', 'noun', 'The country north of the United States.', 'We drove across the border into Canada.'],
  ['pencil', 'noun', 'A thin tool with a core of graphite used for writing.', 'Sharpen your pencil before the test.'],
  ['window', 'noun', 'An opening in a wall fitted with glass to let in light.', 'The cat sat in the sunny window.'],
  ['journey', 'noun', 'A trip from one place to another.', 'The journey took all day.'],
].map(([word, partOfSpeech, definition, sentence]) => ({ id: word, word, partOfSpeech, definition, sentence }));

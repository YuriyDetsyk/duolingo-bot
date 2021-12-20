let intervalDuration = 3500;
let botName = 'DuolingoJS Bot';
let localStorageKey = 'duolingo-bot-answers';
let stories = [
  'Добрий ранок',
  'Побачення',
  'Одна річ',
  'Сюрприз',
  'У музеї',
  'Медовий місяць',
  'Червона куртка',
  'Іспит',
  'Трохи грошей',
  'Суботній вечір',
  'Магазин',
  'Паспорт',
  "Велика сім'я",
  'Нове пальто',
  'Лікар Едді',
  'Новий учень',
  'Питання Джуніора',
  'На вокзал',
  'Вегетаріанець',
  'Більше місця',
  'Я не можу заснути',
  'Ресторан',
  'Два квитки, будь ласка',
  'Урок танців',
  'Знайдіть мою дівчину',
  'Ти не Мері',
  'Поїздка в Париж',
  'Складна проблема',
  'Баскетболіст',
  'Турист',
  'Улюблений обід',
  'Напій, будь ласка!',
  'Перший будинок',
  'Незнайомка',
  'Нічна музика',
  'Новий торговий центр',
  'Дивний шум',
  'Новий домашній улюбленець',
  'Квиток на поїзд',
  'Тренування Джуніора',
];
let tasks = getStorageAnswers();
let uncoveredScenarioCounter = 0;

window.duolingoBotTasks = tasks;

let botFn = () => {
  // Start an available story with points
  let isStoriesPage = location.href.split('?')[0] === 'https://www.duolingo.com/stories';
  if (isStoriesPage) {
    uncoveredScenarioCounter = 0;

    let pendingStoryToOpen = document.querySelector('._3uS_y.eIZ_c');
    if (!pendingStoryToOpen) {
      let availableStories = [...document.querySelectorAll('.X4jDx')].filter((el) => {
        let storyTitle = el.innerText.split('\n')[0];
        let storyPoints = +el.innerText.split('\n')[1].split('+')[1].split(' ')[0];
        return storyPoints > 0 && stories.includes(storyTitle);
      });
      const randomStory = availableStories[Math.floor(Math.random() * availableStories.length)];
      if (!randomStory) {
        console.table(`[${botName}]`, `No available stories left, exiting.`);
        return;
      } else {
        let storyTitle = randomStory.innerText.split('\n')[0];
        console.table(`[${botName}]`, `Starting the '${storyTitle}' story.`);
        randomStory.querySelector('._2eeKH').click();
      }
    } else {
      let readingStory = pendingStoryToOpen.querySelector('._3zRHo.WOZnx._275sd._1ZefG._3hBUD._1f9uq');
      readingStory.click();
    }

    setTimeout(botFn, intervalDuration);
    return;
  }

  let btnStart = document.querySelector('[data-test="story-start"]');
  let continueBtn = document.querySelector('button[data-test="stories-player-continue"]:not([disabled])');
  let finishBtn = document.querySelector('button[data-test="stories-player-done"]:not([disabled])');

  // Press start / continue / finish button, if applicable
  if (btnStart) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Starting the story.`);
    btnStart.click();
    setTimeout(botFn, intervalDuration);
    return;
  } else if (continueBtn) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Continuing the story.`);
    continueBtn.click();
    setTimeout(botFn, intervalDuration);
    return;
  } else if (finishBtn) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Completing the story.`);
    finishBtn.click();
    setTimeout(botFn, intervalDuration);
    return;
  }

  // determine a task type and process it
  let taskWithPairs = document.querySelectorAll('[data-test="stories-token"]');
  let taskWithCompletion = getElementContainingInnerText(
    document.querySelectorAll('[data-test="stories-element"] .phrase'),
    'Виберіть пропущену фразу'
  );
  let taskWithOptions = !taskWithPairs.length && !taskWithCompletion && document.querySelector('[data-test="stories-element"] ul');
  let taskWithPick = getElementContainingInnerText(document.querySelectorAll('[data-test="stories-element"] .phrase'), 'Виберіть варіант');
  let taskWithOrder = getElementContainingInnerText(
    document.querySelectorAll('[data-test="stories-element"] .phrase'),
    'Складіть речення, яке щойно почули'
  );

  if (!!taskWithOptions) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Solving the 'Correct option' task.`);

    let question = (taskWithOptions.previousSibling ?? taskWithOptions.parentNode.parentNode.previousSibling).innerText;
    let answer = tasks.get('options')[question];
    if (!answer || !isCorrectOptionAnswer(answer, taskWithOptions)) {
      console.table(`[${botName}]`, `Answer for tasks.options['${question}'] is unavailable, trying to guess.`);
      let guesses = [...taskWithOptions.querySelectorAll('li')];
      let guessing = true;
      guesses.forEach((guess, index) => {
        setTimeout(() => {
          if (!guessing || hasCorrectAnswer()) {
            return;
          }

          guess.querySelector('button').click();

          setTimeout(() => {
            if (hasCorrectAnswer()) {
              console.table(`[${botName}]`, `Correct guess! Adding the data: { '${question}': '${guess.innerText}' }`);
              let existingAnswer = tasks.get('options')[question];
              if (Array.isArray(existingAnswer)) {
                tasks.set('options', {
                  ...tasks.get('options'),
                  [question]: [...existingAnswer.filter((item) => item !== guess.innerText), guess.innerText],
                });
              } else if (!!existingAnswer) {
                tasks.set('options', { ...tasks.get('options'), [question]: [existingAnswer, guess.innerText] });
              } else {
                tasks.set('options', { ...tasks.get('options'), [question]: guess.innerText });
              }
              setStorageAnswers(tasks);
              guessing = false;
              setTimeout(botFn, intervalDuration);
            } else {
              if (canContinue() || canFinish()) {
                console.table(`[${botName}]`, `Incorrect guess, but can stop guessing.`);
                guessing = false;
                setTimeout(botFn, intervalDuration);
              } else {
                console.table(`[${botName}]`, `Incorrect guess. Continuing to guess.`);
              }
            }
          }, 150);
        }, index * 300);
      });

      return;
    }

    let correctAnswer;
    if (Array.isArray(answer)) {
      correctAnswer = answer.find((item) => isCorrectOptionAnswer(item, taskWithOptions));
    } else {
      correctAnswer = answer;
    }

    let correctOption = getElementContainingInnerText(taskWithOptions.querySelectorAll('li'), correctAnswer);
    correctButton = correctOption.querySelector('button');
    correctButton.click();

    setTimeout(botFn, intervalDuration);
  } else if (!!taskWithPick) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Solving the 'Correct pick' task.`);

    let word = taskWithPick.innerText.split('«')[1].split('»')[0].toLowerCase();
    let answer = tasks.get('pick')[word];
    if (!answer) {
      console.table(`[${botName}]`, `Answer for tasks.pick['${word}'] is unavailable, trying to guess.`);
      let guesses = [...taskWithPick.closest('[data-test="stories-element"]').nextSibling.querySelectorAll('button')];
      let guessing = true;
      guesses.forEach((guess, index) => {
        setTimeout(() => {
          if (!guessing || hasCorrectAnswer()) {
            return;
          }

          guess.click();

          setTimeout(() => {
            if (hasCorrectAnswer()) {
              console.table(`[${botName}]`, `Correct guess! Adding the data: { '${word}': '${guess.innerText}' }`);
              tasks.set('pick', { ...tasks.get('pick'), [word]: guess.innerText });
              setStorageAnswers(tasks);
              guessing = false;
              setTimeout(botFn, intervalDuration);
            } else {
              if (canContinue() || canFinish()) {
                console.table(`[${botName}]`, `Incorrect guess, but can stop guessing.`);
                guessing = false;
                setTimeout(botFn, intervalDuration);
              } else {
                console.table(`[${botName}]`, `Incorrect guess. Continuing to guess.`);
              }
            }
          }, 150);
        }, index * 300);
      });

      return;
    }

    let correctOption = getElementContainingInnerText(
      taskWithPick.closest('[data-test="stories-element"]').nextSibling.querySelectorAll('button'),
      answer
    );
    correctOption.click();

    setTimeout(botFn, intervalDuration);
  } else if (!!taskWithCompletion) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Solving the 'Correct completion' task.`);

    let phrase = taskWithCompletion.closest('[data-test="stories-element"').nextSibling.innerText;
    let answer = tasks.get('complete').find((completionItem) => completionItem[0] === phrase)?.[1];
    if (!answer) {
      console.table(`[${botName}]`, `Answer for tasks.complete['${phrase}'] is unavailable, trying to guess.`);

      setTimeout(() => {
        let guesses = [...taskWithCompletion.closest('[data-test="stories-element"]').nextSibling.nextSibling.querySelectorAll('button')];
        let guessing = true;
        guesses.forEach((guess, index) => {
          setTimeout(() => {
            if (!guessing || hasCorrectAnswer()) {
              return;
            }

            guess.click();

            setTimeout(() => {
              if (hasCorrectAnswer()) {
                console.table(`[${botName}]`, `Correct guess! Adding the data: ['${phrase}': '${guess.innerText}']`);
                tasks.set('complete', [...tasks.get('complete'), [phrase, guess.innerText]]);
                setStorageAnswers(tasks);
                guessing = false;
                setTimeout(botFn, intervalDuration);
              } else {
                if (canContinue() || canFinish()) {
                  console.table(`[${botName}]`, `Incorrect guess, but can stop guessing.`);
                  guessing = false;
                  setTimeout(botFn, intervalDuration);
                } else {
                  console.table(`[${botName}]`, `Incorrect guess. Continuing to guess.`);
                }
              }
            }, 150);
          }, index * 300);
        });
      }, 2000);

      return;
    }

    setTimeout(() => {
      let correctOption = getElementWithInnerText(
        taskWithCompletion.closest('[data-test="stories-element"').nextSibling.nextSibling.querySelectorAll('[data-test="stories-choice"]'),
        answer
      );
      if (correctOption) {
        correctOption.click();
      } else {
        correctOption = getElementContainingInnerText(
          taskWithCompletion.closest('[data-test="stories-element"').nextSibling.nextSibling.querySelectorAll('li'),
          answer
        );
        correctOption.querySelector('button').click();
      }

      setTimeout(botFn, intervalDuration);
    }, 2000);
  } else if (!!taskWithOrder) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Solving the 'Correct order' task.`);

    let sentencePartElements = taskWithOrder.closest('[data-test="stories-element"').nextSibling.nextSibling.querySelectorAll('span');

    let sentenceParts = [...sentencePartElements].map((el) => el.innerText);
    let answer = tasks.get('order').find((sentence) => sentenceParts.every((part) => sentence.replaceAll('_', ' ').includes(part)));
    if (!answer) {
      console.table(`[${botName}]`, `Answer for tasks.order['${sentenceParts}'] is unavailable, trying to guess.`);
      guessOrdering(() => {
        setTimeout(botFn, intervalDuration);
      });

      return;
    }

    answer.split(' ').forEach((part, index) => {
      setTimeout(() => {
        let correctOption = getElementWithInnerText(sentencePartElements, part.replaceAll('_', ' '));
        if (correctOption) {
          correctOption.click();
        }
      }, index * 300);
    });

    setTimeout(botFn, intervalDuration);
  } else if (taskWithPairs.length) {
    uncoveredScenarioCounter = 0;
    console.table(`[${botName}]`, `Solving the 'Correct pairs' task.`);

    let storyName = getStoryName();
    if (!tasks.get('pairs')[storyName]) {
      console.table(`[${botName}]`, `tasks.pairs['${storyName}'] is missing, creating an empty list of pairs.`);
      tasks.set('pairs', { ...tasks.get('pairs'), [storyName]: [] });
      setStorageAnswers(tasks);
    }

    let answers = tasks.get('pairs')[storyName];

    if (!answers.length) {
      // Guess new word pairs
      console.table(`[${botName}]`, `Starting to guess the remaining pairs.`);
      guessWordPairs();
      return;
    }

    // Process existing dictionary
    answers.forEach(([firstWord, secondWord], index) => {
      setTimeout(() => {
        let firstWordBtn = getElementContainingInnerText(taskWithPairs, firstWord);
        let secondWordBtn = getElementContainingInnerText(taskWithPairs, secondWord);

        if (firstWordBtn && secondWordBtn) {
          // click on the 1st word in the pair
          firstWordBtn.click();

          // click on the 2nd word in the pair
          setTimeout(() => {
            secondWordBtn.click();

            if (index === answers.length - 1) {
              // Guess new word pairs
              console.table(`[${botName}]`, `Starting to guess the remaining pairs.`);
              guessWordPairs();
            }
          }, 300);
        } else if (index === answers.length - 1) {
          // Guess new word pairs
          console.table(`[${botName}]`, `Starting to guess the remaining pairs.`);
          guessWordPairs();
        }
      }, index * 800);
    });
  } else {
    if (uncoveredScenarioCounter >= 3) {
      console.table(`[${botName}]`, `Uncovered scenario, exiting.`);
      uncoveredScenarioCounter = 0;
      return;
    }

    uncoveredScenarioCounter++;
    console.table(`[${botName}]`, `Uncovered scenario, retrying (${uncoveredScenarioCounter} / 3).`);
    setTimeout(botFn, intervalDuration);
  }
};

console.clear();
console.table(`[${botName}]`, `Initialized...`);
setTimeout(botFn, intervalDuration);

/* Helper functions */
function getElementContainingInnerText(elements, ...texts) {
  return [...elements].find((el) => !isHidden(el) && texts.some((text) => el.innerText.includes(text)));
}
function getElementWithInnerText(elements, ...texts) {
  return [...elements].find((el) => !isHidden(el) && texts.some((text) => el.innerText === text));
}

function isHidden(element) {
  return element?.offsetParent === null;
}

function getStoryName() {
  let locationParts = location.href.split('/');
  return locationParts[locationParts.length - 1].split('?')[0];
}

function canContinue() {
  return !!document.querySelector('button[data-test="stories-player-continue"]:not([disabled])');
}

function canFinish() {
  return !!document.querySelector('button[data-test="stories-player-done"]:not([disabled])');
}

function hasCorrectAnswer() {
  return !!document.querySelector('h2');
}

function isOrderItemSolved(item) {
  return item?.classList?.contains('LhRk3');
}

function isPairSolved(btn) {
  return btn?.classList?.contains('_3alTu');
}

function guessOrdering(callback, sentencePrefix = '', incorrectGuessesList = []) {
  let sentence = sentencePrefix;
  let incorrectGuesses = incorrectGuessesList;
  let guesses = [
    ...getElementContainingInnerText(
      document.querySelectorAll('[data-test="stories-element"] .phrase'),
      'Складіть речення, яке щойно почули'
    )
      .closest('[data-test="stories-element"')
      .nextSibling.nextSibling.querySelectorAll('button'),
  ].filter((g) => !isOrderItemSolved(g) && !incorrectGuesses.includes(g.innerText));
  let guess = guesses[0];

  if (guess) {
    guess.click();

    if (isOrderItemSolved(guess)) {
      console.table(`[${botName}]`, `Correct partial guess! Adding the sentence part: '${guess.innerText}'`);
      sentence += ` ${guess.innerText.replaceAll(' ', '_')}`;
      incorrectGuesses = [];
    } else {
      console.table(`[${botName}]`, `Incorrect guess. Continuing to guess.`);
      incorrectGuesses.push(guess.innerText);
    }

    setTimeout(() => {
      guessOrdering(callback, sentence, incorrectGuesses);
    }, 300);
  } else {
    sentence = sentence.trim();
    console.table(`[${botName}]`, `Correct guess! Adding the sentence: '${sentence}'`);
    tasks.set('order', [...tasks.get('order'), sentence]);
    setStorageAnswers(tasks);
    callback();
    return;
  }
}

let incorrectPairs = [];

function guessWordPairs() {
  const availableWordBtns = [...document.querySelectorAll('[data-test="stories-token"]')].filter((btn) => !isPairSolved(btn));
  const firstBtn = availableWordBtns[0];
  if (!firstBtn) {
    setTimeout(botFn, intervalDuration);
    return;
  }

  const secondBtn = availableWordBtns.find((btn) => {
    return (
      btn.innerText !== firstBtn.innerText &&
      !incorrectPairs.some(([word1, word2]) => {
        return (word1 === firstBtn.innerText && word2 === btn.innerText) || (word2 === firstBtn.innerText && word1 === btn.innerText);
      })
    );
  });

  if (firstBtn) {
    firstBtn?.click();

    setTimeout(() => {
      if (!secondBtn) {
        setTimeout(() => guessWordPairs(), 800);
        return;
      }

      secondBtn.click();

      if (isPairSolved(firstBtn)) {
        console.table(`[${botName}]`, `Correct guess! Adding the data: ['${firstBtn.innerText}': '${secondBtn.innerText}']`);
        let storyName = getStoryName();
        tasks.set('pairs', {
          ...tasks.get('pairs'),
          [storyName]: [...tasks.get('pairs')[storyName], [firstBtn.innerText, secondBtn.innerText]],
        });
        setStorageAnswers(tasks);

        incorrectPairs = incorrectPairs.filter(([word1, word2]) => {
          if (
            (word1 === firstBtn.innerText && word2 === secondBtn.innerText) ||
            (word2 === firstBtn.innerText && word1 === secondBtn.innerText)
          ) {
            return false;
          }

          return true;
        });

        setTimeout(() => guessWordPairs(), 800);
      } else {
        console.table(`[${botName}]`, `Incorrect guess. Continuing to guess.`);
        incorrectPairs.push([firstBtn.innerText, secondBtn.innerText]);

        setTimeout(() => guessWordPairs(), 800);
      }
    }, 300);
  }
}

function getStorageAnswers() {
  const data = localStorage.getItem(localStorageKey);
  if (data) {
    return new Map(JSON.parse(data));
  } else {
    const answers = new Map();
    answers.set('options', {
      'Що означає «honey»?': 'коханий',
      'Що робить Лорен?': 'Вона кладе цукор у каву.',
      "Що означає «It's salt!»?": 'Це сіль!',
      'Лорен була настільки стомленою, що…': '… поклала сіль в каву.',
      'Чоловік, який розмовляє з Джулією, запитує...': '... що вона хоче їсти.',
      'Чому він це сказав?': 'Він теж вегетаріанець.',
      'Джулія та Деніел мали зустрітися з іншими людьми.': 'Так, це правда.',
      'Наприкінці історії Деніел…': "… збрехав про своє справжнє ім'я, бо йому сподобалась Джулія.",
      'Стів хоче знати, чи потрібно його сестрі йти до супермаркету.': 'Так, це правда.',
      'Що зробила Дженніфер?': 'Вона дала Стіву гроші, щоб він купив їй хліб.',
      '… and I want some sugar for my coffee.': 'for my coffee',
      'Хто ще має прийти?': 'Подруга матері Брюса.',
      'Мама Брюса хоче…': '… щоб Брюс сходив на побачення з її подругою Сонею.',
      'Чому мати Брюса здивована?': 'Вона не знала, що у Брюс у стосунках.',
      'У чому сюрприз Брюса?': 'Він одружений з Карлою.',
      'Бет у таксі і хоче поїхати в аеропорт.': 'Так, це правда.',
      'Водій хоче знати…': '… чи Бет їде у відпустку.',
      'Чому Бет їде до Каліфорнії?': 'Це її медовий місяць.',
      'Дружина Бет…': '… не хоче їхати з нею до Каліфорнії.',
      'Що сталося, коли Бет приїхала до аеропорту?': 'Її дружина Аманда вибачилася і сказала, що кохає її.',
      'Бен думає, що з кухні долинає шум.': 'Ні, це неправда.',
      "Oh, it's the dog!": '… the dog.',
      'Ребекка зазвичай обідає в ресторані.': 'Ні, це неправда.',
      'Що подобається Хуану?': 'Салат-латук і помідори.',
      '… with no meat, no bread, and a lot of lettuce and tomatoes!': 'lettuce and tomatoes',
      'Вікторія запитує Піта, чи має він плани на ці вихідні.': 'Так, це правда.',
      'Чому Піт дивується?': 'Вікторія — гітаристка групи.',
      'Офіціант вважає, що…': '… Вікраму варто замовити курку.',
      'Чому Вікрам був незадоволений офіціантом?': 'Він постійно забував, що Вікрам вегетаріанець.',
      'На якому поверсі живе Вікрам?': 'На четвертому поверсі.',
      'Тепер Джуніор…': '… втомлений.',
      'Будинок належить бабусі та дідусю Райана, але вони там не живуть.': 'Так, це правда.',
      'Що вирішили Райан та Джина?': 'Переїхати за місто у будинок дідуся та бабусі Райана.',
      'Брайану потрібні гроші, щоб піти в кіно.': 'Так, це правда.',
      'Мати Брайана…': '… дає йому гроші.',
      'Кого бачить Бетсі?': 'Улюбленого баскетболіста Роба.',
      'Чому Роб нервується?': 'Баскетболіст дивиться на них.',
      'Чому тато Джуніора так кричить?': 'Він захопився футбольним матчем по телевізору.',
      'Тато Джуніора…': '… так захопився футбольним матчем, що не звертав уваги на Джуніора.',
      'Чому Ребекка сміється?': 'Складне замовлення Хуана — це просто салат.',
      'На старих фотографіях немає автомобілів.': 'Так, це правда.',
      'The students are from the School of Medicine.': 'School of Medicine',
      'Що сталося в історії?': [
        'Дідусь Ерін побачив у музеї фотографію своєї бабусі.',
        'Жінка помилилася і подумала, що Вікрам працює в магазині.',
      ],
      'Easy! Why do you need new clothes?': 'new clothes',
      'Навіщо чоловіку новий одяг?': 'У нього співбесіда на роботу.',
      'Де відбудеться співбесіда?': 'У магазині, де він купував одяг.',
      'На день народження Кевіна Софі збирається купити йому…': '… дешеву куртку.',
      'Що має на увазі Анна?': 'Вона єдина дочка у своєї матері.',
      'Джуніор хоче грати у відеоігри, а Едді хоче, щоб він потренувався.': 'Так, це правда.',
      'Жінка хоче, щоб Едді…': '… допоміг чоловікові, якому дуже погано.',
      'Що зробив Едді?': 'Збрехав, а тоді спробував знайти справжнього лікаря, щоб допомогти чоловікові.',
      "Вікрам любить їсти м'ясо.": 'Ні, це неправда.',
      'Піт каже…': '… що Вікторія — чудова гітаристка.',
      'Оскар сидить в таксі, а за кермом — його подруга Лін.': 'Так, це правда.',
      'Оскар не знає…': '… де вокзал.',
      'Лін починає…': '… їхати.',
      'Що вирішила зробити Лін?': 'Повернутися додому, тому що водити таксі занадто складно.',
      'Do you want to go with me?': '… with me?',
      'Чому Ріджес не хоче собаку?': 'Він стомився і більше не хоче відповідальності.',
      'Пенелопа —': 'подруга тата Джуніора.',
      'У цьому ресторані…': '… подають лише страви з картоплі.',
      'Паспорта Вікрама немає ні в сумці, ні в куртці.': 'Так, це правда.',
      'Де був паспорт Вікрама?': 'У нього в руці.',
      'Карл і Крістіна із задоволенням повертаються додому.': 'Ні, це неправда.',
      'У супермаркеті до Едді підійшла жінка і почала розмовляти з ним.': 'Так, це правда.',
      'Жінка говорить до Вікрама у магазині.': 'Так, це правда.',
      'Що жінка має на увазі?': 'Вона вважає, що Вікрам добре справляється зі своєю роботою.',
      'Вікрам…': '… не знає, де жінка може заплатити за пальто.',
      'Що є в новому торговому центрі?': 'Кінотеатр з технологією 3D.',
      'Що вони збираються зробити?': 'Піти у торговий центр, щоб подивитися фільм та поїсти страви мексиканської кухні.',
      'Софі подобається магазин, тому що там дешеві речі.': 'Ні, це неправда.',
      'Скільки коштує куртка?': "П'ятсот доларів.",
      'Чому Джуніор здивований?': 'Він думає, що тато погодився дати йому гроші на піцу.',
      "Шеллі зустрічається із сім'єю Анни.": 'Так, це правда.',
      'Після того, як Шеллі познайомилася з усіма…': "… мати Анни радо прийняла її до своєї сім'ї.",
      'Що Бен має на увазі?': 'Він збирається викликати поліцію.',
      'Службовий телефон Гаррі задзвонив, коли він розмовляв з другом.': 'Так, це правда.',
      'Хто ця незнайомка?': 'Начальниця Гаррі.',
      'Начальниця Гаррі зателефонувала сказати…': '… що йому потрібно працювати, а не розмовляти зі своїми друзями.',
      'Зарі та Лілі сидять разом у шкільному автобусі.': 'Так, це правда.',
      'Тоні хоче, щоб Джонні перестав грати на гітарі, бо він стомлений.': 'Так, це правда.',
      'Вікрам вважає, що червоне пальто…': '… дуже красиве.',
      'Yes! I like soup! Do you have tomato soup?': 'tomato soup',
      'Енді розмовляє зі своєю мамою.': 'Ні, це неправда.',
      'Що Енді сказав своєму батькові?': 'У його мами народиться дитина.',
      'Yes, I have my homework.': 'my homework',
      'Люк хоче знати, чи…': '… Сара готова до іспиту.',
      'Що зробив баскетболіст?': 'Він сказав, що йому подобається Робове взуття.',
      'Are you on vacation?': '... on vacation?',
      'Пабло із задоволенням приймає…': '… запрошення піти в інший парк з Андреа.',
      'Ванесса хоче знати, чи готовий Джордж до іспиту з української мови.': 'Так, це правда.',
      'Що має на увазі Ванесса?': 'Джордж ніколи не готується до іспитів.',
      'You can have a dog!': 'a dog',
      'Would you like to listen to music?': 'music',
      'Чому Роберт і Ріта не можуть послухати музику?': 'Їхня дитина спить.',
      'Що зробила Сара?': 'Вона запросила Люка на концерт.',
      'У вітальні Джуніора сидить жінка.': 'Так, це правда.',
      'Елізабет хоче знати…': '… чи Алекс все ще вважає помилкою прийти до неї на урок.',
      'Що сталося з Алексом?': 'Він помилково прийшов на урок танців замість уроку кулінарії.',
      'Що каже Кевін?': 'Сьогодні у нього день народження.',
      'Що запитує Райан?': 'Чи Джина хоче кудись поїхати на поїзді.',
      'Чому Джуніор хотів купити квиток до Барселони?': 'Він не хотів писати контрольну роботу з математики.',
      'Що сталося з Робертом?': 'Він допоміг Ріті заснути, а сам не зміг.',
      "Енді вважає, що його сім'ї потрібно…": '… більше грошей.',
      'Чому Емілі говорить це офіціанту?': 'Вона хоче довести, що доросла.',
      'Чому Емілі засмутилась?': 'Офіціант запропонував їй склянку молока.',
      'Джуніор — дорослий.': 'Ні, це неправда.',
      'Що запитує Крістіна?': 'Ти впевнений?',
      'Що Алекс має на увазі?': 'Він вважає, що не повинен бути у цьому класі.',
      'Чоловік знаходиться…': '… біля молока у супермаркеті.',
      'Чому Брайан не може взяти автомобіль своєї матері?': 'Вона поїде на автомобілі в кіно.',
      'Тато Джуніора дивиться футбольний матч по телевізору.': 'Так, це правда.',
      'Що має на увазі Джуніор?': 'Він не піде до школи у понеділок.',
      'Метью хоче знати…': '… чому Лейла їде до Чикаго.',
      'Що зробила Лейла?': 'Віддала Метью свій квиток на поїзд.',
      'Крістіна та Карл вирішили…': '… жити в Парижі.',
      'Цей торговий центр…': '… той самий, який вони знають, але він змінив свою назву.',
      'Коли відбудеться іспит?': 'Наступного тижня.',
      'Чому Ванесса збрехала Джорджу про іспит?': 'Вона хотіла допомогти йому підготуватися.',
      'Бен хоче, щоб пес...': '… був у будинку і захищав його.',
      'Чому Джонні займається?': 'Він хоче стати хорошим гітаристом.',
      'OK, OK. No guitar.': 'No guitar',
      'У місті, в якому живе Ребекка, відкрили новий торговий центр.': 'Так, це правда.',
      'Що має на увазі Енді?': 'Їм потрібно більше місця.',
      'Працівник каже, що…': '… у літаку є два місця разом.',
      'Чому працівник ставить питання про дівчину Бі?': 'Він намагається допомогти Бі знайти її.',
      'Пабло — турист, який шукає парк.': 'Так, це правда.',
      'Працівниця магазину каже, що не зможе допомогти чоловікові.': 'Ні, це неправда.',
      'Чому Джуніор не може поїхати до Барселони?': 'У нього лише тринадцять доларів.',
      'Лейла розмовляє з офіціантом у ресторані.': 'Так, це правда.',
      'Чому Лейла їде до Чикаго?': 'У неї співбесіда на роботу.',
      'How much are two tickets?': 'two tickets',
      'Ерін каже…': '… що на фотографії лише одна жінка-студентка.',
      'Чому Пенелопа пішла?': 'Вона не знала, що Мері — пташка Едді та Джуніора.',
      'Що хоче побачити офіціант?': 'Паспорт Емілі.',
      'Чому Джордж дивується?': 'Він вважає, що сьогодні у нього немає іспиту.',
      'Едді…': '… обманом змусив Джуніора потренуватися.',
      'Can I look at the newspaper ?': '… newspaper?',
      'Бі хоче сидіти поруч зі своєю дівчиною в літаку.': 'Так, це правда.',
      'Зарі здивована, тому що…': '… вона не знала, що Мігель сидить позаду неї.',
      'Що зробив Джонні?': 'Він перестав грати на гітарі, але почав грати на фортепіано.',
      "I do not eat fish ! I'm a vegetarian!": 'vegetarian',
      'Бі хоче, щоб працівник допоміг їй сісти біля…': '… когось, хто може стати її новою дівчиною.',
      'He speaks three languages .': 'languages',
    });
    answers.set('order', [
      'I need my book',
      'But my parents are_from Ukraine',
      'Here_is some_money Steve',
      'My friend is_very nice',
      'Who is there',
      'Wow this_is easy',
      'A_burger with_no_meat and no_fries',
      'On_Saturday_night Pete goes to_the_concert',
      "it's_near",
      'but the_train_station',
      'Can_I use your car',
      'You_have the_same shoes',
      'She_is my grandmother',
      'What do_you need',
      'And I love the_parks',
      'These are_my grandparents',
      "but it's_near the_train_station",
      'Eddy is_not a_doctor',
      'and clean the_windows',
      "She's_not_happy about Mary",
      'Can_I_have a sandwich',
      "This mall isn't new",
      'All_of_the_office can hear you',
      'Johnny starts to_play the_piano',
      "And that's a_problem",
      "And I'm_studying Spanish",
      'Which color do_you_like',
      'Sorry I_need your identification',
      "No I don't want a_potato_salad",
      'But tickets_are too expensive',
      "I don't know what to_do",
    ]);
    answers.set('pick', {
      'стомлена': 'tired',
      'домашніх тварин': 'pets',
      'хліб': 'bread',
      'підбігає': 'runs',
      'дивиться': 'looks',
      'наш': 'Our',
      'думаю': 'think',
    });
    answers.set('complete', [
      ['For my salad!', 'my salad'],
      ['How are you?', 'How are you'],
      ['I have a ticket to a concert on Saturday night!', 'on Saturday night'],
      ['Can we go now?', 'Can we go now'],
      ['Here is more for the dictionary.', 'Here is more'],
      ['My favorite store!', 'My favorite store'],
      ['We can live and work here!', 'live and work'],
      ['This red jacket is perfect!', 'red jacket'],
      ['You have a big family!', 'a big family'],
      ['Houses in the city are too expensive.', 'in the city'],
      ['Hello. I have a question about the menu.', 'the menu'],
      ['He hears a noise.', 'hears a noise'],
      ['A dog is a lot of work...', 'a lot of work'],
      ['Johnny! What are you doing?!', 'What are you doing'],
      ['I would like a glass of water and a salad, please.', 'a glass of water'],
      ['What do we need from the supermarket?', 'from the supermarket'],
      ['You need to take the bus…', 'to take the bus'],
      ['So… Is Mary here often?', 'here often'],
      ["I can't sleep.", "I can't sleep"],
      ['I like gray!', 'I like gray'],
      ["I'm eight years old.", 'years old'],
      ['Hi. I would like a beer, please.', 'I would like'],
      ['I have my credit card and my phone—', 'I have my'],
      ["You don't know your girlfriend's name?", "your girlfriend's name"],
      ['Oh no. Where is my passport?', 'Where is my passport'],
      ["Today we're learning to dance !", "we're learning to dance"],
      ['Hi, Lily! How are you?', 'How are you'],
      ['But I know you.', 'I know you'],
      ['Who is this?', 'Who is this'],
      ['Are you OK, Sarah?', 'Are you OK'],
      ['Nice to meet you!', 'Nice to meet you'],
    ]);
    answers.set('pairs', {
      'en-uk-good-morning': [
        ['добрий ранок', 'good morning'],
        ['вибач', 'sorry'],
        ["п'є", 'drinks'],
        ['іспит', 'exam'],
        ['де', 'where'],
        ['будь ласка', 'please'],
        ['кладе', 'puts'],
        ['стіл', 'table'],
        ['книга', 'book'],
        ['цукор', 'sugar'],
        ['сіль', 'salt'],
        ['стомлений', 'tired'],
        ['кава', 'coffee'],
        ['коханий', 'honey'],
        ['ти', 'you'],
        ['where', 'де'],
      ],
      'en-uk-a-date': [
        ['домашні тварини', 'pets'],
        ['ресторан', 'restaurant'],
        ['як справи', 'how are you'],
        ['побачення', 'date'],
        ['привіт', 'hi'],
        ['батьки', 'parents'],
        ["м'ясо", 'meat'],
        ['салат', 'salad'],
        ['теж', 'too'],
        ['дякую', 'thanks'],
        ['звідки ти', 'where are you from'],
        ['говорить', 'speaks'],
        ['їсти', 'to eat'],
        ['заходить', 'enters'],
      ],
      'en-uk-one-thing': [
        ['кава', 'coffee'],
        ['хліб', 'bread'],
        ['супермаркет', 'supermarket'],
        ['молоко', 'milk'],
        ['один', 'one'],
        ['брат', 'brother'],
        ['ось', 'here'],
        ['помідор', 'tomato'],
        ['потрібно', 'need'],
        ['дякую', 'thank you'],
        ['річ', 'thing'],
        ['ідея', 'idea'],
        ['йти', 'to go'],
        ['хочу', 'want'],
        ['гроші', 'money'],
      ],
      'en-uk-surprise': [
        ['стіл', 'table'],
        ['це', 'this'],
        ['теж', 'too'],
        ['три', 'three'],
        ['заходить', 'enters'],
        ['будь ласка', 'please'],
        ['сюрприз', 'surprise'],
        ['мій', 'my'],
        ['подруга', 'friend'],
        ['вона', 'she'],
        ['ресторан', 'restaurant'],
        ['коханий', 'honey'],
        ['дуже', 'very'],
        ['мама', 'mom'],
        ['милий', 'nice'],
      ],
      'en-uk-in-the-museum': [
        ['лише', 'only'],
        ['але', 'but'],
        ['тут', 'here'],
        ['photos', 'фотографії'],
        ['students', 'студенти'],
        ['жінка', 'woman'],
        ['музей', 'museum'],
        ['дивиться', 'looks'],
        ['автомобілі', 'cars'],
        ['interesting', 'цікавий'],
        ['так', 'yes'],
        ['university', 'університет'],
        ['with', 'із'],
        ['grandfather', 'дідусь'],
        ['красивий', 'beautiful'],
      ],
      'en-uk-honeymoon': [
        ['непроста', 'difficult'],
        ['мій', 'my'],
        ['їхати', 'to go'],
        ['треба', 'need'],
        ['медовий місяць', 'honeymoon'],
        ['I love you', 'я кохаю тебе'],
        ['засмучений', 'sad'],
        ['airport', 'аеропорт'],
        ['відпустка', 'vacation'],
        ['runs', 'підбігає'],
        ['чоловік', 'husband'],
        ['добрий ранок', 'good morning'],
        ['дружина', 'wife'],
        ['two', 'два'],
      ],
      'en-uk-a-strange-noise': [
        ['opens', 'відчиняє'],
        ['шум', 'noise'],
        ['walks to', 'підходить до'],
        ['hears', 'чує'],
        ['police', 'поліція'],
        ['щось', 'something'],
        ['сад', 'garden'],
        ['guard dog', 'сторожовий пес'],
        ['to call', 'телефонувати'],
        ['bedroom', 'спальня'],
        ['інше', 'different'],
        ['тоді', 'then'],
        ['come in', 'заходь'],
      ],
      'en-uk-a-question': [
        ['school', 'школа'],
        ['need', 'потрібно'],
        ['busy', 'зайнятий'],
        ['question', 'питання'],
        ['гроші', 'money'],
        ['відеогра', 'video game'],
        ['Monday', 'понеділок'],
        ['easy', 'легко'],
        ['біжи', 'go'],
        ['football game', 'футбольний матч'],
        ['і', 'and'],
        ['sorry', 'і'],
        ['and', 'і'],
        ['dad', 'тато'],
        ['зараз', 'now'],
        ['really', 'справді'],
        ['and', 'і'],
        ['вибач', 'really'],
        ['now', 'вибач'],
        ['sorry', 'вибач'],
      ],
      'en-uk-favorite-lunch': [
        ['desk', 'робочий стіл'],
        ['дуже', 'very'],
        ['картопля фрі', 'fries'],
        ['eat lunch', 'обідаю'],
        ['улюблений', 'favorite'],
        ["I don't like", 'мені не подобається'],
        ['looks', 'виглядає'],
        ['restaurant', 'ресторан'],
        ['смачний', 'delicious'],
        ['бургер', 'burger'],
        ['usually', 'зазвичай'],
        ['same thing', 'те саме'],
        ['салат-латук', 'lettuce'],
        ['лише', 'only'],
      ],
      'en-uk-saturday-night': [
        ['new', 'новий'],
        ['concert', 'концерт'],
        ['квиток', 'ticket'],
        ['сюрприз', 'surprise'],
        ['вихідні', 'weekend'],
        ['hello', 'привіт'],
        ['want', 'хочеш'],
        ['plans', 'плани'],
        ['Saturday', 'субота'],
        ['to go', 'піти'],
        ['друг', 'friend'],
        ['talks', 'говорить'],
        ['мати', 'to have'],
      ],
      'en-uk-the-vegetarian': [
        ['welcome', 'ласкаво просимо'],
        ['lettuce', 'салат-латук'],
        ['delicious', 'смачний'],
        ['fries', 'картопля фрі'],
        ['is reading', 'читає'],
        ['меню', 'menu'],
        ['їм', 'eat'],
        ['chicken', 'курка'],
        ['помідор', 'tomato'],
        ['steaks', 'стейки'],
        ['meat', "м'ясо"],
        ['їжа', 'food'],
        ['їм', 'eat'],
        ['вегетаріанець', 'vegetarian'],
      ],
      'en-uk-junior-s-exercise': [
        ['думає', 'thinks'],
        ['floor', 'поверх'],
        ['я втомився', "I'm tired"],
        ['потренуватися', 'to exercise'],
        ['чому', 'why'],
        ['відеоігри', 'video games'],
        ['fourth', 'четвертий'],
        ['магазин', 'store'],
        ['is playing', 'грає'],
        ['keys', 'ключі'],
        ['minute', 'хвилина'],
        ['біжить', 'runs'],
        ['money', 'гроші'],
        ['to go', 'піти'],
      ],
      'en-uk-first-house': [
        ['дідусь і бабуся', 'grandparents'],
        ['small', 'маленький'],
        ['house', 'будинок'],
        ['too', 'занадто'],
        ['expensive', 'дорогий'],
        ['думає', 'thinks'],
        ['наш', 'our'],
        ['подивитися', 'to see'],
        ['they', 'вони'],
        ['собака', 'dog'],
        ['want', 'хочуть'],
        ['купити', 'to buy'],
      ],
      'en-uk-a-little-bit-of-money': [
        ['купити', 'to buy'],
        ['can', 'можна'],
        ['money', 'гроші'],
        ['бібліотека', 'library'],
        ['exam', 'іспит'],
        ['піти в кіно', 'to see a movie'],
        ['фільм', 'movie'],
        ['потрібно', 'need'],
        ['thanks', 'дякую'],
        ['автобус', 'bus'],
        ['словник', 'dictionary'],
        ['more', 'більше'],
        ['автомобіль', 'car'],
        ['please', 'будь ласка'],
        ['exam', 'іспит'],
      ],
      'en-uk-the-basketball-player': [
        ['сюди', 'here'],
        ['молоко', 'milk'],
        ['eggs', 'яйця'],
        ['supermarket', 'супермаркет'],
        ['look', 'дивись'],
        ['взуття', 'shoes'],
        ['basketball player', 'баскетболіст'],
        ['to do', 'робити'],
        ['хто', 'who'],
        ['basketball', 'баскетбол'],
        ['роблять покупки', 'are shopping'],
        ['одинаковий', 'same'],
        ['favorite', 'улюблений'],
        ['beans', 'квасоля'],
        ['квасоля', 'beans'],
        ['favorite', 'улюблений'],
        ['too', 'занадто'],
      ],
      'en-uk-the-store': [
        ['clothes', 'одяг'],
        ['what', 'що'],
        ['jackets', 'куртки'],
        ['good morning', 'добрий ранок'],
        ['цей', 'this'],
        ['магазин', 'store'],
        ['white', 'білий'],
        ['shirt', 'сорочка'],
        ['мені подобається', 'I like'],
        ['nice', 'гарний'],
        ['співбесіда', 'interview'],
        ['pants', 'штани'],
        ['boots', 'черевики'],
        ['навіщо', 'why'],
        ['дуже', 'very'],
      ],
      'en-uk-visiting-paris': [
        ['sure', 'впевнений'],
        ['really', 'справді'],
        ['люблю', 'love'],
        ['restaurant', 'ресторан'],
        ['so', 'такий'],
        ['to live', 'жити'],
        ['французький', 'French'],
        ['want', 'хочу'],
        ['щасливий', 'happy'],
        ['офіціанти', 'waiters'],
        ['роботи', 'jobs'],
        ['хліб', 'bread'],
        ['парки', 'parks'],
        ['у відпустці', 'on vacation'],
        ['їхати', 'to go'],
      ],
      'en-uk-the-red-jacket': [
        ['birthday', 'день народження'],
        ['магазин', 'store'],
        ['today', 'сьогодні'],
        ['долари', 'dollars'],
        ["п'ятсот", 'five hundred'],
        ['this', 'цей'],
        ['to buy', 'купити'],
      ],
      'en-uk-big-family': [
        ['big', 'великий'],
        ['how are you', 'як справи'],
        ['only', 'лише'],
        ['daughter', 'дочка'],
        ['favorite', 'улюблений'],
        ['girlfriend', 'дівчина'],
        ['grandparents', 'бабуся та дідусь'],
        ['now', 'тепер'],
        ['family', "сім'я"],
        ['ласкаво просимо', 'welcome'],
        ['маєш', 'have'],
        ['my', 'мій'],
        ['is meeting', 'зустрічається'],
        ['брат', 'brother'],
        ['це', 'this'],
      ],
      'en-uk-doctor-eddy': [
        ['near', 'біля'],
        ['supermarket', 'супермаркет'],
        ['sick', 'погано'],
        ['чоловік', 'man'],
        ['but', 'але'],
        ['starts', 'починає'],
        ['дуже', 'very'],
        ['гроші', 'money'],
        ['expensive', 'дорогий'],
        ['help', 'допоможіть'],
        ['now', 'зараз'],
        ['runs', 'підбігає'],
        ['будинок', 'house'],
        ['молоко', 'milk'],
        ['бачить', 'sees'],
      ],
      'en-uk-to-the-station': [
        ['вокзал', 'station'],
        ['gets in', 'сідає в'],
        ['їхати', 'to go'],
        ['is driving', 'керує'],
        ['знаю', 'know'],
        ['again', 'знову'],
        ['friend', 'подруга'],
        ['apartment', 'квартира'],
        ['new', 'новий'],
      ],
      'en-uk-new-pet': [
        ['вікна', 'windows'],
        ['спочатку', 'first'],
        ['three', 'три'],
        ['багато', 'a lot of'],
        ['ванна кімната', 'bathroom'],
        ['car', 'автомобіль'],
        ["I'm tired", 'я стомився'],
        ['to wash', 'помити'],
        ['finishes', 'закінчує'],
        ['work', 'робота'],
        ['look', 'подивися'],
        ['dog', 'собака'],
        ['later', 'потому'],
      ],
      'en-uk-you-re-not-mary': [
        ['living room', 'вітальня'],
        ['comes out', 'виходить'],
        ['не задоволена', 'not happy'],
        ['тато', 'dad'],
        ['girlfriend', 'дівчина'],
        ['often', 'часто'],
        ['знати', 'to know'],
        ['hi', 'привіт'],
        ['school', 'школа'],
        ['йде', 'leaves'],
        ['too much', 'занадто багато'],
        ['кожний день', 'every day'],
        ['ранок', 'morning'],
        ['bathroom', 'ванна кімната'],
        ['розмовляє', 'talks'],
      ],
      'en-uk-the-restaurant': [
        ['мені подобається', 'I like'],
        ['to eat', 'поїсти'],
        ['wait', 'чекайте'],
        ['city', 'місто'],
        ['суп', 'soup'],
        ['want', 'хочу'],
        ['ресторан', 'restaurant'],
        ['please', 'будь ласка'],
        ['картопля', 'potato'],
        ['food', 'їжа'],
        ['sandwich', 'сендвіч'],
        ['вода', 'water'],
        ['салат', 'salad'],
        ['що', 'what'],
        ['без', 'without'],
      ],
      'en-uk-the-passport': [
        ['love', 'кохання'],
        ['проблема', 'problem'],
        ['airport', 'аеропорт'],
        ['big', 'великий'],
        ['рука', 'hand'],
        ['now', 'зараз'],
        ['runs', 'біжить'],
        ['таксі', 'taxi'],
        ['passport', 'паспорт'],
        ['wife', 'дружина'],
        ['але', 'but'],
        ['де', 'where'],
        ['your', 'твій'],
        ['тут', 'here'],
        ['сумка', 'bag'],
      ],
      'en-uk-a-new-coat': [
        ['потрібно', 'need'],
        ['store', 'магазин'],
        ['дешевий', 'cheap'],
        ['жінка', 'woman'],
        ['work', 'працюю'],
        ['red', 'червоний'],
        ['know', 'знаю'],
        ['красивий', 'beautiful'],
        ['brown', 'коричневий'],
        ['я', 'I'],
        ['help', 'допомога'],
        ['new', 'новий'],
        ['подобається', 'like'],
        ['пальто', 'coat'],
        ['привіт', 'hi'],
      ],
      'en-uk-the-new-mall': [
        ['shopping mall', 'торговий центр'],
        ['movie theater', 'кінотеатр'],
        ['читає', 'is reading'],
        ['що', 'what'],
        ['місто', 'city'],
        ['газета', 'newspaper'],
        ['new', 'новий'],
        ['this', 'цей'],
        ['Mexican', 'мексиканський'],
        ['to go', 'піти'],
        ['really', 'справді'],
        ['want', 'хочу'],
        ['the same', 'той самий'],
      ],
      'en-uk-the-stranger': [
        ['sorry', 'вибачте'],
        ['потрібно', 'need'],
        ['службовий телефон', 'office phone'],
        ['закінчити', 'to finish'],
        ['почну', 'start'],
        ['is ringing', 'дзвонить'],
        ['просто зараз', 'right now'],
        ['хто', 'who'],
        ['вихідні', 'weekend'],
        ['boss', 'начальниця'],
        ['police', 'поліція'],
        ['work', 'робота'],
        ['подруга', 'friend'],
        ['знаю', 'know'],
      ],
      'en-uk-the-new-student': [
        ['hi', 'привіт'],
        ['school bus', 'шкільний автобус'],
        ['клас', 'class'],
        ['shoes', 'черевики'],
        ['languages', 'мови'],
        ['behind', 'позаду'],
        ['books', 'книги'],
        ['разом', 'together'],
        ['учень', 'student'],
        ['розмовляє', 'speaks'],
        ['there is', 'є'],
        ['interesting', 'цікаво'],
        ['пише', 'writes'],
        ['are sitting', 'сидять'],
        ['новий', 'new'],
      ],
      'en-uk-night-music': [
        ['послухай', 'listen'],
        ['спати', 'to sleep'],
        ['дівчина', 'girlfriend'],
        ['guitar player', 'гітарист'],
        ['tired', 'стомлений'],
        ['чоловіки', 'men'],
        ['starts', 'починає'],
        ['бути', 'to be'],
        ['what', 'що'],
        ['stop', 'перестань'],
        ['good night', 'добраніч'],
        ['women', 'жінки'],
        ['very', 'дуже'],
        ['також', 'too'],
        ['займатися', 'to practice'],
      ],
      'en-uk-more-space': [
        ['new', 'новий'],
        ['дитина', 'baby'],
        ['для', 'for'],
        ['need', 'потрібно'],
        ['місце', 'space'],
        ['very', 'дуже'],
        ['наш', 'our'],
        ['car', 'автомобіль'],
        ['більше', 'more'],
        ['dad', 'тато'],
        ['навіщо', 'why'],
        ['маленький', 'small'],
        ['гроші', 'money'],
        ['house', 'будинок'],
        ['job', 'робота'],
      ],
      'en-uk-a-difficult-problem': [
        ['ручка', 'pen'],
        ['іспит', 'exam'],
        ['привіт', 'hi'],
        ['університет', 'university'],
        ['need', 'потрібна'],
        ['help', 'допомогти'],
        ['думаю', 'think'],
        ['але', 'but'],
        ['tonight', 'сьогодні ввечері'],
        ['tickets', 'квитки'],
        ['with me', 'зі мною'],
        ['домашнє завдання', 'homework'],
        ['концерт', 'concert'],
        ['проблема', 'problem'],
        ['готовий', 'ready'],
        ['привіт', 'hi'],
      ],
      'en-uk-the-tourist': [
        ['парк', 'park'],
        ['звичайно', 'of course'],
        ['is looking for', 'шукає'],
        ['nice to meet you', 'приємно познайомитися'],
        ['excuse me', 'вибачте'],
        ['to take the bus', 'сісти на автобус'],
        ['on vacation', 'у відпустці'],
        ['йти', 'to go'],
        ['зупинка', 'stop'],
        ['відвідує', 'is visiting'],
        ['поговорити', 'to talk'],
        ['люблю', 'love'],
        ['near here', 'поблизу'],
        ['ще', 'more'],
      ],
      'en-uk-the-exam': [
        ['тиждень', 'week'],
        ['difficult', 'складний'],
        ['hello', 'здрастуйте'],
        ['to study', 'вчитися'],
        ['Ukrainian', 'українська мова'],
        ['exam', 'іспит'],
        ['ніколи', 'never'],
        ['university', 'університет'],
        ['готовий', 'ready'],
        ['сьогодні', 'today'],
        ['години', 'hours'],
        ['потому', 'later'],
        ['next', 'наступний'],
        ['заняття', 'class'],
      ],
      'en-uk-i-can-t-sleep': [
        ['music', 'музика'],
        ['baby', 'дитина'],
        ['would you like', 'ти хочеш'],
        ['слухати', 'to listen'],
        ['milk', 'молоко'],
        ['warm', 'теплий'],
        ['склянка', 'glass'],
        ['walls', 'стіни'],
        ['gray', 'сірий'],
        ['is sleeping', 'спить'],
        ['which', 'який'],
        ['bedroom', 'спальня'],
        ['фарба', 'paint'],
      ],
      'en-uk-the-dance-class': [
        ["don't leave", 'не йдіть'],
        ['mistake', 'помилка'],
        ['to dance', 'танцювати'],
        ['сьогодні', 'today'],
        ['sometimes', 'іноді'],
        ['quickly', 'швидко'],
        ['дивиться', 'watches'],
        ['двері', 'door'],
        ['walks', 'заходить'],
        ['too', 'також'],
        ['so', 'отже'],
        ['урок', 'class'],
        ['room', 'кімната'],
        ['легко', 'easy'],
        ['весело', 'fun'],
      ],
      'en-uk-two-tickets-please': [
        ['вісім', 'eight'],
        ['допомогти', 'help'],
        ['desk', 'стійка'],
        ['where', 'куди'],
        ['країна', 'country'],
        ['квиток', 'ticket'],
        ['долари', 'dollars'],
        ['батьки', 'parents'],
        ['talks', 'розмовляє'],
        ['контрольна робота з математики', 'math test'],
        ['чотириста', 'four hundred'],
        ['купити', 'to buy'],
        ['today', 'сьогодні'],
        ['airport', 'аеропорт'],
      ],
      'en-uk-a-drink-please': [
        ['кредитна картка', 'credit card'],
        ['identification', 'посвідчення особи'],
        ['passport', 'паспорт'],
        ["тридцять п'ять", 'thirty-five'],
        ['drink', 'напій'],
        ['but', 'але'],
        ['діти', 'children'],
        ['cold', 'холодний'],
        ['beer', 'пиво'],
        ['adult', 'дорослий'],
        ['я можу вам допомогти', 'can I help you'],
        ['робота', 'job'],
        ['готельний номер', 'hotel room'],
        ['зачекайте', 'wait'],
      ],
      'en-uk-find-my-girlfriend': [
        ['tall', 'високий'],
        ['стійка', 'desk'],
        ['next to', 'поруч із'],
        ['темний', 'dark'],
        ['hair', 'волосся'],
        ['разом', 'together'],
        ['літак', 'plane'],
        ['місця', 'seats'],
        ['to sit', 'сидіти'],
        ['ви можете допомогти мені', 'can you help me'],
        ['любить', 'loves'],
        ['де', 'where'],
        ['girlfriend', 'дівчина'],
      ],
      'en-uk-the-train-ticket': [
        ['job interview', 'співбесіда на роботу'],
        ['ресторан', 'restaurant'],
        ["you're working", 'ви працюєте'],
        ['leaves', 'відправляється'],
        ["сім'я", 'family'],
        ['дорогий', 'expensive'],
        ['soon', 'скоро'],
        ['to visit', 'провідати'],
        ['waiter', 'офіціант'],
        ['train station', 'залізничний вокзал'],
        ['talks', 'розмовляє'],
        ['want', 'хочу'],
        ['but', 'але'],
        ['why', 'чому'],
      ],
    });

    setStorageAnswers(answers);
    return new Map(JSON.parse(localStorage.getItem(localStorageKey)));
  }
}

function setStorageAnswers(tasks) {
  const answers = Array.from(tasks.entries());
  localStorage.setItem(localStorageKey, JSON.stringify(answers));
}

function isCorrectOptionAnswer(answer, taskWithOptions) {
  let correctOption = getElementContainingInnerText(taskWithOptions.querySelectorAll('li'), answer);
  return !!correctOption?.querySelector('button');
}

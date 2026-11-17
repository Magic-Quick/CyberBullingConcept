'use strict';
const data = window.QUIZ_AUDIO;
const $ = id => document.getElementById(id);
let currentShow = 'pole_chudes';
let secret = 'ИНТЕРАКТИВ';
let guessed = new Set();
let selectedAnswer = null;
let checkedAnswer = false;
let timerInterval = null;
let timerDeadline = 0;
let timerWarning = false;
let timerDuration = 60;
let clipStop = null;
const cueLabels = {theme:'Заставка',theme_logo:'Заставка',spinner:'Волчок',wheel:'Барабан',letter_correct:'Буква угадана',letter_wrong:'Нет буквы',word_correct:'Слово угадано',think_60s:'Минута ожидания',question_bed:'Фон вопроса',lock_answer:'Ответ принят',correct_easy:'Верно',wrong_medium:'Неверно',gong:'Гонг',minute_start:'Начало минуты',warning_signal:'Предупреждение',minute_end:'Конец минуты'};
const toolbarRoles = {pole_chudes:['theme','wheel','letter_correct','letter_wrong','word_correct','think_60s'],millionaire:['theme','question_bed','lock_answer','correct_easy','wrong_medium'],chgk:['theme_logo','spinner','minute_start','warning_signal','minute_end','gong']};
const assets = {
  pole_chudes:[['tile_blank_cutout.png','Синяя ячейка из кадра · PNG'],['tile_closed.png','Закрытая синяя ячейка · PNG'],['word_row_10_blank.png','Пустое слово · 10 ячеек'],['word_row_14_blank.png','Пустое слово · 14 ячеек'],['tile_blank.svg','Синяя ячейка · SVG'],['word_row_raw.png','Табло с Якубовичем · вырезка']],
  millionaire:[['question_blank_cutout.png','Пустой вопрос · PNG'],['answer_blank_cutout.png','Пустой ответ · PNG'],['answer_selected.png','Выбранный ответ · PNG'],['answer_correct.png','Верный ответ · PNG'],['quiz_overlay_blank.png','Вопрос + четыре ответа'],['question_blank.svg','Чистая рамка · SVG']],
  chgk:[['timer_ring.svg','Таймер · SVG'],['question_panel.svg','Плашка вопроса · SVG'],['table_reference_crop.jpg','Стол · референс']]
};

function findCue(role,show=currentShow){return data.audio.find(a=>a.show===show&&a.role===role&&a.status==='downloaded_verified');}
function stopAudio(){clearTimeout(clipStop);clipStop=null;$('audioPlayer').pause();$('audioPlayer').currentTime=0;}
function playTrack(track,maxSeconds=0){
  if(!track)return;
  stopAudio();$('audioStatus').textContent='';
  const player=$('audioPlayer');player.src=track.path;player.volume=.55;
  $('nowPlaying').textContent=track.source_label;
  const playing=player.play();
  if(playing)playing.catch(()=>{$('audioStatus').textContent='Воспроизведение не началось. Нажмите Play в плеере.';});
  if(maxSeconds)clipStop=setTimeout(()=>player.pause(),maxSeconds*1000);
}
function cue(role,show=currentShow,maxSeconds=0){playTrack(findCue(role,show),maxSeconds);}
function durationLabel(value){const seconds=Math.round(value);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');}

function renderAudio(){
  const query=$('audioSearch').value.trim().toLocaleLowerCase('ru');
  const list=data.audio.filter(a=>a.show===currentShow&&a.status==='downloaded_verified'&&(!$('featuredOnly').checked||a.featured)&&(!query||(a.source_label+' '+a.role).toLocaleLowerCase('ru').includes(query)));
  const all=data.audio.filter(a=>a.show===currentShow).length;
  $('audioCount').textContent=list.length+' / '+all;
  $('audioList').replaceChildren();
  for(const track of list){
    const item=document.createElement('div');item.className='audio-item';
    const title=document.createElement('div');title.className='audio-title';
    const play=document.createElement('button');play.textContent='▶';play.setAttribute('aria-label','Слушать: '+track.source_label);play.onclick=()=>playTrack(track);
    const text=document.createElement('p');text.textContent=track.source_label;title.append(play,text);
    const meta=document.createElement('div');meta.className='audio-meta';
    const download=document.createElement('a');download.href=track.path;download.download=track.path.split('/').pop();download.textContent='MP3';
    const source=document.createElement('a');source.href=track.source_page;source.target='_blank';source.rel='noopener';source.textContent='Источник';
    meta.append(download,source,document.createTextNode(durationLabel(track.duration_seconds)));item.append(title,meta);$('audioList').append(item);
  }
  if(!list.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Ничего не найдено. Попробуйте снять фильтр основных сигналов.';$('audioList').append(empty);}
}
function renderTools(){
  $('cueToolbar').replaceChildren();
  for(const role of toolbarRoles[currentShow]){const button=document.createElement('button');button.textContent=cueLabels[role]||role;button.onclick=()=>cue(role);$('cueToolbar').append(button);}
  $('assetGrid').replaceChildren();
  for(const [file,label] of assets[currentShow]){const link=document.createElement('a');link.href=currentShow+'/graphics/'+file;link.download=file;link.className='asset-card';const box=document.createElement('div');box.className='asset-thumb';const image=document.createElement('img');image.src=link.href;image.alt=label;box.append(image);const caption=document.createElement('span');caption.textContent=label;link.append(box,caption);$('assetGrid').append(link);}
  $('referenceLink').href=currentShow+'/references/browser_screenshot.jpg';
}
function changeShow(show){
  resetTimer();stopAudio();currentShow=show;
  document.querySelectorAll('[data-show]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.show===show)));
  for(const [key,stage,editor] of [['pole_chudes','poleStage','poleEditor'],['millionaire','millionStage','millionEditor'],['chgk','chgkStage','chgkEditor']]){$(stage).hidden=key!==show;$(editor).hidden=key!==show;}
  $('modeCaption').textContent={pole_chudes:'Классическое синее табло',millionaire:'Вопрос и четыре ответа',chgk:'Обсуждение → сигнал → ответ'}[show];
  $('audioSearch').value='';renderTools();renderAudio();
}

function renderWord(){
  $('wordBoard').replaceChildren();
  for(const character of Array.from(secret)){const tile=document.createElement('span');const letter=/[\p{L}\p{N}]/u.test(character);tile.className='tile'+(/\s/u.test(character)?' gap':!letter?' punctuation':'');tile.textContent=!letter||guessed.has(character)?character:'';tile.setAttribute('aria-label',tile.textContent||'Скрытая буква');$('wordBoard').append(tile);}
}
function guessLetter(){
  const letter=$('letterInput').value.trim().toLocaleUpperCase('ru');$('letterInput').value='';
  if(!/^[\p{L}\p{N}]$/u.test(letter))return;
  if(guessed.has(letter)){$('wordFeedback').textContent='Эту букву уже называли';return;}
  guessed.add(letter);const found=secret.includes(letter);renderWord();
  const solved=Array.from(secret).every(ch=>!/[\p{L}\p{N}]/u.test(ch)||guessed.has(ch));
  $('wordFeedback').textContent=solved?'Слово открыто':found?'Буква открыта':'Такой буквы нет';
  cue(solved?'word_correct':found?'letter_correct':'letter_wrong','pole_chudes');$('letterInput').focus();
}
function renderAnswers(){
  $('answerCards').replaceChildren();
  for(const key of ['A','B','C','D']){const button=document.createElement('button');button.className='answer-card';button.dataset.answer=key;
    if(checkedAnswer){if(key===$('correctAnswer').value)button.classList.add('correct');else if(key===selectedAnswer)button.classList.add('wrong');}else if(key===selectedAnswer)button.classList.add('selected');
    const mark=document.createElement('strong');mark.textContent=key+':';const text=document.createElement('span');text.textContent=$('answer'+key).value;button.append(mark,text);
    button.onclick=()=>{if(checkedAnswer)return;selectedAnswer=key;renderAnswers();$('millionFeedback').textContent='Выбран вариант '+key;cue('lock_answer','millionaire');};$('answerCards').append(button);
  }
}
function resetTimer(){
  clearInterval(timerInterval);timerInterval=null;timerWarning=false;
  const seconds=Number($('discussionSeconds').value);timerDuration=Number.isFinite(seconds)?Math.min(180,Math.max(5,Math.round(seconds))):60;
  $('timerValue').textContent=String(timerDuration);$('timerStatus').textContent='После сигнала откроется поле ответа';$('writtenAnswer').value='';$('writtenAnswer').disabled=true;$('submitWrittenAnswer').disabled=true;$('startMinute').disabled=false;
}
function startTimer(){
  resetTimer();$('discussionSeconds').value=String(timerDuration);$('chgkQuestionDisplay').textContent=$('chgkQuestionInput').value;
  timerDeadline=performance.now()+timerDuration*1000;$('startMinute').disabled=true;$('timerStatus').textContent='Идёт обсуждение';cue('minute_start','chgk');
  timerInterval=setInterval(()=>{
    const left=Math.max(0,Math.ceil((timerDeadline-performance.now())/1000));$('timerValue').textContent=String(left);
    if(left<=0){clearInterval(timerInterval);timerInterval=null;cue($('endSignal').value,'chgk');$('writtenAnswer').disabled=false;$('submitWrittenAnswer').disabled=false;$('timerStatus').textContent='Сигнал. Введите ответ.';$('writtenAnswer').focus();$('startMinute').disabled=false;}
    else if(!timerWarning&&left<=Math.min(10,Math.floor(timerDuration/3))){timerWarning=true;cue('warning_signal','chgk');}
  },100);
}

document.querySelectorAll('[data-show]').forEach(button=>button.onclick=()=>changeShow(button.dataset.show));
$('audioSearch').oninput=renderAudio;$('featuredOnly').onchange=renderAudio;$('stopAudio').onclick=stopAudio;
$('applyWord').onclick=()=>{const value=$('secretWord').value.trim().toLocaleUpperCase('ru');if(!/[\p{L}\p{N}]/u.test(value)){$('wordFeedback').textContent='Введите слово';return;}secret=value;guessed.clear();renderWord();$('wordFeedback').textContent='Слово скрыто';};
$('guessLetter').onclick=guessLetter;$('letterInput').onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();guessLetter();}};
$('revealWord').onclick=()=>{guessed=new Set(Array.from(secret));renderWord();$('wordFeedback').textContent='Слово открыто';cue('word_correct','pole_chudes');};
$('applyQuestion').onclick=()=>{$('questionCard').textContent=$('questionInput').value;selectedAnswer=null;checkedAnswer=false;renderAnswers();$('millionFeedback').textContent='Выберите вариант, затем проверьте ответ';};
$('checkAnswer').onclick=()=>{if(!selectedAnswer){$('millionFeedback').textContent='Сначала выберите вариант';return;}checkedAnswer=true;renderAnswers();const correct=selectedAnswer===$('correctAnswer').value;$('millionFeedback').textContent=correct?'Верный ответ':'Правильный ответ: '+$('correctAnswer').value;cue(correct?'correct_easy':'wrong_medium','millionaire');};
$('startMinute').onclick=startTimer;$('resetMinute').onclick=()=>{resetTimer();stopAudio();};
$('discussionSeconds').onchange=()=>{resetTimer();stopAudio();};
$('writtenAnswerForm').onsubmit=event=>{event.preventDefault();if($('writtenAnswer').disabled||!$('writtenAnswer').value.trim())return;$('timerStatus').textContent='Ответ принят: '+$('writtenAnswer').value.trim();$('writtenAnswer').disabled=true;$('submitWrittenAnswer').disabled=true;};
renderWord();renderAnswers();renderTools();renderAudio();

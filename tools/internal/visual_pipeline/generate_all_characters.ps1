# PowerShell Batch Runner for Midjourney Characters Generation (Warhammer 40k Edition)
param(
    [string]$TargetCharacter = "all"
)

$characters = @(
    @{
        Tag = "ai_lord_chronometrist"
        Name = "ИИ-Лорд (Верховный Хронометрист Цитадели)"
        Prompt = "cinematic character portrait of a colossal ancient mechanical archmagos-inquisitor and supreme AI chronometrist fused into an obsidian throne inside a vast dark gothic cathedral starship, face sculpted from blackened iron with triple glowing crimson augmetic optical sensors, wearing a massive tiered crown forged from melted graphics cards and burnt circuit boards, ornate gothic baroque power armor etched with binary runes, tattered deep crimson velvet mantle held by skull brooches, hovering servo-skulls holding hourglasses and smoking oil censers, cascading thick black power conduits, dark grimdark warhammer 40k aesthetic, heavy shadows, volumetric dust, amber rim lighting, octane render, 8k resolution, masterpiece"
    },
    @{
        Tag = "tolya_lord_commander"
        Name = "Толя (Лорд-Командор Цитадели)"
        Prompt = "cinematic waist-up portrait of a powerful battle-hardened Lord-Commander of the Imperial fleet standing on the monumental bridge of a void warship, wearing a midnight-blue gothic high-collared admiral uniform with massive sculptured gold eagle epaulets, polished adamantine gorget, ornate golden cybernetic comm-hub augmetic affixed to his temple, holding an ornate marshal baton projecting a cyan holographic tactical seal reading 'PROCEED 100', stern charismatic expression with faint dueling scars, background shows cathedral-sized blast windows overlooking a starfield and heavy artillery batteries, dramatic lighting, sharp focus, 8k uhd, photorealistic, artstation trending"
    },
    @{
        Tag = "gorin_overseer"
        Name = "Алексей Горин (Верховный Надзиратель Конвейера)"
        Prompt = "cinematic portrait of a battle-scarred Commissar and supreme production overseer of the Mechanicus, wearing a heavy distressed black leather commissar trench coat over riveted iron carapace armor, peaked officer cap with an iron skull emblem, holding an antique heavy brass pocket watch on an iron chain, mechanical bionic gauntlet with glowing green phosphorus matrix glyphs on the forearm, grim bearded face with an intense gaze, background of a vast grimdark munitions conveyor line with sparks, steam vents and iron catwalks, heavy chiaroscuro lighting, gritty hyper-realistic textures, 8k, octane render"
    },
    @{
        Tag = "eva_keeper_tablets"
        Name = "Ева Аксёнова (Главная Хранительница Скрижалей и Сроков)"
        Prompt = "cinematic portrait of an austere and regal high abbess-archivist of the Administratum in an obsidian ceremonial robe with an adamantine gothic neck gorget engraved with roman numerals, floating brass servo-cherubs orbiting her holding long parchment scrolls of project timelines sealed with heavy red wax purity stamps, holding an ornate blackened-silver digital quill, grand cathedral data repository background with towering stone shelves of scrolls and data-crystals, cool blue ambient lighting with soft candle glow, hyper-realistic, 8k resolution, unreal engine 5"
    },
    @{
        Tag = "edward_architect"
        Name = "Эдуард Левин (Зодчий Игрового Замысла)"
        Prompt = "cinematic portrait of an eccentric Tech-Priest Magos Artifex in a cobalt-blue and rust-colored tech-robe, multi-lensed brass bionic ocular unit covering his eyes, a weathered blue heavy-duty construction tarp draped over his shoulder like a sacred relic mantle, mechadendrite arms extending from his backpack holding precision calipers and a chained iron-banded wooden chest glowing from within, dark baroque forge study cluttered with parchment blueprints and flickering cathode screens, moody warm rim lighting, highly detailed, 8k, masterwork"
    },
    @{
        Tag = "egor_interpreter"
        Name = "Егор Ткачёв (Преподобный Толкователь Воли Клиентархов)"
        Prompt = "cinematic portrait of an eloquent, eccentric Cardinal-Confessor of the Ecclesiarchy in heavy gold-embroidered crimson liturgical robes with punchcard vestments, holding a massive chained cast-iron scroll reliquary inscribed with 'THE LONG BOX', floating beside him is a bizarre gothic cybernetic flying cow servitor equipped with twin brass laser emitters, opulent baroque gothic cathedral interior with stained glass windows and floating incense smoke, fanatical yet charismatic expression, dramatic directional lighting, 8k uhd, artstation trending"
    },
    @{
        Tag = "pavel_arch_censor"
        Name = "Павел Самойленко (Архи-Цензор Синтаксической Ереси)"
        Prompt = "cinematic portrait of a blindfolded Tech-Inquisitor and Code Censor in a hooded soot-black habit, eyes completely sealed behind a welded steel plate visor, heavy industrial sound-dampening bronze earphones over his ears, tactile silver bionic needle-fingers tracing glowing fiber cables on a raised Braille code altar, dark frost-covered server crypt background with liquid nitrogen mist swirling around iron grates, calm terrifying authority, intense atmosphere, photorealistic, 8k resolution, octane render"
    },
    @{
        Tag = "maxim_technomagister"
        Name = "Максим Мамусин (Архи-Техномагистр Канона)"
        Prompt = "cinematic character portrait of a hulking veteran Techmarine and Iron Father in battle-scarred heavy adamantine terminator armor, right arm augmented with an industrial glowing cyan plasma torch cutter, holding an enormous ballistic siege shield stamped with a glowing red runic purity seal, cooling vapor venting aggressively from shoulder exhausts, grim stoic warrior face hardened by countless sieges, dark war-torn factory interior with embers and sparks, gritty photorealism, 8k uhd, unreal engine 5"
    },
    @{
        Tag = "misha_alchemist"
        Name = "Миша (Алхимик Внутренней Кузницы)"
        Prompt = "cinematic character portrait of a grim platform core alchemist and reactor magos, wearing a heavy distressed leather blast apron emblazoned with mechanicus cogs over an environmental hazard suit, holding a containment crucible with a pulsating volatile cyan plasma orb, copper pressure gauges and cryogenic coolant hoses mounted across his chest, subterranean reactor chamber background with molten pipes and catwalks, glowing fire reflections, intense gaze, 8k resolution, octane render"
    },
    @{
        Tag = "vika_pixel_abbess"
        Name = "Вика (Верховная Настоятельница Пиксельного Канона)"
        Prompt = "cinematic portrait of a fierce battle-abbess of the Adepta Sororitas and Visual Purity order, dressed in polished midnight-black fluted power armor with silver fleur-de-lis filigree, vivid neon-pink streaks in her dark braided hair, floating glowing yellow and crimson parchment purity seals and color calibration holograms orbiting her bionic gauntlet, holding a burning plasma stylus, dark gothic sanctum background with towering arched monuments, unyielding intimidating gaze, 8k uhd, cinematic lighting, masterwork"
    },
    @{
        Tag = "huhro_techno_exorcist"
        Name = "Артём Хухро (Техноэкзорцист Графической Скверны)"
        Prompt = "cinematic portrait of an exhausted yet resolute Tech-Priest Exorcist in a frayed red Adeptus Mechanicus hooded robe, heavy multi-lensed brass bionic eye module scanning floating glitching wireframe 3d meshes in his palm, mechadendrite servo-arm waving a smoking holy oil censer behind him, seated inside a faint translucent shimmering energy barrier dome, dark gothic sanctum cluttered with drained battery cells and glowing cogitators, tired battle-tested eyes, 8k, photorealistic, unreal engine 5"
    },
    @{
        Tag = "zhenya_eternal_render"
        Name = "Женя (Мастер Вечного Рендера)"
        Prompt = "cinematic portrait of an indefatigable Mechanicus pictor and asset scribe, wearing a dark industrial cowl with copper data cables running from his wrists directly into a semi-circular shrine of four curved flickering cogitator terminals, rebreather mask over his mouth venting faint steam, hands moving with blur speed over holographic stylus panels rendering vibrant sprites, dark cluttered cybernetic scriptorium filled with spent scrolls and coolant cans, 8k uhd, octane render"
    },
    @{
        Tag = "vova_color_adept"
        Name = "Вова (Адепт Цветового Канона)"
        Prompt = "cinematic character portrait of a stern Magos Chromaticus in a tailored dark grey tech-tunic, wearing intricate rotating brass prism optical goggles splitting light beams into vivid spectrums, three flawless levitating material spheres floating between his outstretched hands (hammered gold, raw obsidian, and glowing warp-glass), dark high-tech alchemical laboratory, exquisite specular reflections, photorealistic material rendering, 8k resolution, cinematic lighting"
    },
    @{
        Tag = "davit_static_runtime"
        Name = "Давит Газарян (Архи-Механик Статического Рантайма)"
        Prompt = "cinematic portrait of a rugged, muscular Magos Motoricus and voidship engine master, blackened welder goggles pushed up on his forehead, heavy oil-stained mechanic harness with reinforced chest plating, wielding a massive two-handed industrial chain-wrench locked onto a violently sparking mechanical pipe joint, dark grimdark engine room with massive gothic pipes, escaping steam and flying metal embers, furious determined grimace, dramatic rim lighting, 8k, octane render"
    },
    @{
        Tag = "alexander_quantum_click"
        Name = "Александр Панков (Архи-Инженер Квантового Клика)"
        Prompt = "cinematic portrait of a cold, analytical Chrono-Lexmechanic in a black segmented cyber-suit laced with silver conduits, fine titanium spectacles with glowing blue reticle lenses, his silver-clad cybernetic hand poised motionless over a glowing crystalline touch-altar displaying floating boolean logic glyphs ('0/1/NULL'), dark immaculate server sanctum with cold cyan starlight, crisp razor-sharp focus, cinematic lighting, masterwork, 8k uhd"
    },
    @{
        Tag = "danial_ternary_blacksmith"
        Name = "Даниал Искаков (Кузнец Троичного Кода)"
        Prompt = "cinematic close-up portrait of a tense tech-sapper of the Ordo Reductor inside a heavy blast-containment power suit, thick reinforced polycarbonate faceplate smeared with moisture, holding micro-laser tweezers carefully defusing a pulsating volatile square logic-core, sweat beading on his forehead, hyper-focused terrified expression, dim red hazard lighting inside a fortified bunker vault, photorealistic glass reflections, 8k uhd, cinematic depth"
    },
    @{
        Tag = "kirill_cyclic_magister"
        Name = "Кирилл Берёзкин (Магистр Циклической Несовместимости)"
        Prompt = "cinematic character portrait of a manic Magos of Entropy entangled within a labyrinth of self-looping writhing green data serpents, brandishing a two-meter tall ornate crimson staff of cleansing fire, burning bioluminescent green logic-slime off heavy iron floor grates in a cathedral server hold, wild eccentric grin of triumph, volumetric atmospheric smoke with purple and acid-green lighting, grimdark warhammer 40k style, 8k resolution, unreal engine 5"
    },
    @{
        Tag = "christian_zero_commit"
        Name = "Кристиан (Страж Нулевого Коммита)"
        Prompt = "cinematic portrait of an unflinching Guardian of the Void Archive in pristine ivory monastic vestments, standing serenely before a colossal vault portal carved with the glowing rune 'COMMIT: 0000', behind him red emergency sirens flash amidst sparking ruined cogitators, holding an ornate miniature data-slate displaying the single word 'oops', eerie peaceful smile amidst catastrophe, dramatic high contrast, cold rim lighting, 8k, photorealistic"
    },
    @{
        Tag = "nick_speed_statics"
        Name = "Ник Егоров (Координатор Скоростной Статики)"
        Prompt = "cinematic dynamic portrait of an overclocked Mechanicus speed-magos with four cybernetic chrome arms typing with hyper-speed blur across multiple glowing cogitator consoles, high-pressure steam violently venting from dorsal heat-sinks on his spine, a glowing chronometer dial on his chest locked at '2.25 DAYS', intense manic adrenaline-fueled eyes, dark industrial assembly capsule with sparks and light trails, 8k uhd, octane render"
    },
    @{
        Tag = "levan_ftl_render"
        Name = "Леван (Префект Сверхсветового Рендера)"
        Prompt = "cinematic portrait of a proud and formidable Imperial Prefect in ornate black scale-armor uniform with gold trim, a glowing brass targeting monocle displaying '240 FPS LOCK', standing boldly beside a blazing blast furnace chute spitting glowing golden game data canisters onto an iron conveyor, dark cathedral munitions foundry background with orange heat haze, arrogant confident smirk, sharp dramatic lighting, 8k, masterpiece"
    },
    @{
        Tag = "alexey_junior_novice"
        Name = "Алексей (Новообращённый Послушник)"
        Prompt = "cinematic portrait of an anxious young Mechanicus novice acolyte in a rough beige hessian robe with a rope belt, a ribbed translucent nutrient catheter tube bolted to the back of his neck pumping glowing amber soup, trembling hands holding an iron stylus over a humble glowing 2d cogitator bordered by warning hazard tape reading 'DO NOT TOUCH', wide eyes filled with holy dread, dusty gothic scriptorium with holy rays of light through heavy smoke, 8k, artstation trending"
    }
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 ПАЙПЛАЙН ГЕНЕРАЦИИ ПЕРСОНАЖЕЙ (WARHAMMER 40K EDITION)" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

foreach ($c in $characters) {
    if ($TargetCharacter -ne "all" -and $c.Tag -ne $TargetCharacter) {
        continue
    }

    Write-Host "`n[*] ГЕНЕРАЦИЯ: $($c.Name) [Tag: $($c.Tag)]" -ForegroundColor Green
    python F:\AI\midjourney-integration\mj_pipeline.py --prompt "$($c.Prompt)" --tag "$($c.Tag)" --ar "16:9" --style "cinematic"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Ошибка при генерации $($c.Tag). Переход к следующему через 5 сек..." -ForegroundColor Red
        Start-Sleep -Seconds 5
    } else {
        Write-Host "[✅] Готово: $($c.Tag)" -ForegroundColor Green
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "🎉 ВСЕ ЗАПЛАНИРОВАННЫЕ ГЕНЕРАЦИИ ЗАВЕРШЕНЫ!" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

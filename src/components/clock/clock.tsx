import {Component, Element, Event, EventEmitter, h} from '@stencil/core';
import {BehaviorSubject, combineLatest, fromEvent, Subject, timer} from 'rxjs';
import {filter, map, shareReplay, startWith, switchMap, take, takeUntil, withLatestFrom} from 'rxjs/operators';

@Component({
    tag: 'my-clock',
    styleUrls: ['./clock.scss'],
    shadow: true
})

export class Clock {
    @Element() private element: HTMLElement;

    @Event() takeTime: EventEmitter<number>;
    @Event() stopClock: EventEmitter<number>;

    private minutesArray = new Array(30).fill(true);
    private fiveMinutesArray = new Array(6).fill(true);
    private fifteenMinutesArray = new Array(2).fill(true);

    // define buttons
    private startButton;
    private stopButton;
    private takeButton;
    private pauseButton;
    //define streams
    private start$;
    private take$;
    private pause$;
    private stop$;
    // creating observables
    private interval$;
    private currentSeconds$;
    private pauseValue$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private cancel$: Subject<boolean> = new Subject<boolean>();
    private destroy$: Subject<boolean> = new Subject<boolean>();
    //domElements
    private secondsPointer: HTMLElement;
    private minutesPointer: HTMLElement;
    private hoursPointer: HTMLElement;

    //methods
    private selectHtmlElements() {
        const root = this.element.shadowRoot;
        this.secondsPointer = root.querySelector('.seconds-pointer');
        this.minutesPointer = root.querySelector('.minutes-pointer');
        this.hoursPointer = root.querySelector('.hours-pointer');
        this.startButton = root.querySelector('.start-button');
        this.stopButton = root.querySelector('.stop-button');
        this.takeButton = root.querySelector('.take-button');
        this.pauseButton = root.querySelector('.pause-button');
    }

    private initialiseUserInteractionStreams() {
        this.start$ = fromEvent(this.startButton, 'click');
        this.take$ = fromEvent(this.takeButton, 'click').pipe(startWith(0));
        this.pause$ = fromEvent(this.pauseButton, 'click').pipe(startWith(0));
        this.stop$ = fromEvent(this.stopButton, 'click');
    }

    private createTimers() {
        this.interval$ = timer(0, 1000);

        this.currentSeconds$ = this.start$.pipe(
            take(1),
            switchMap(_ => this.interval$.pipe(
                withLatestFrom(this.pauseValue$),
                map(([currentSeconds, pauseValue]) => (currentSeconds + pauseValue)),
                takeUntil(this.cancel$),
            )),
            shareReplay(1)
        );

        combineLatest([this.take$, this.pause$]).pipe(
            takeUntil(this.cancel$),
            filter(([a, b]) => (a !== 0 || b !== 0)),
            withLatestFrom(this.currentSeconds$)
        ).subscribe(this.handleClick.bind(this));

        this.currentSeconds$.subscribe(this.calculateRotation.bind(this, 'sec'));
    }

    private handleClick(clickEvent) {
        clickEvent[0][1] ! == 0  ? this.handleTakeClick(clickEvent[1]) : this.handlePause(clickEvent[1]);
    }

    private handleTakeClick(lapTime: number) {
        console.log(lapTime);
        this.takeTime.emit(lapTime);
    }

    private handlePause(currentTime) {
        this.pauseValue$.next(currentTime);
        this.cancel$.next(true);
        this.createTimers();
    }

    private calculateRotation(timing, value) {
        switch (timing) {
            case 'sec':
                this.secondsPointer.style.transform = `rotate(${90 + (value % 60) * 6}deg)`;
                if (value > 60) this.calculateRotation('min',(value - (value % 60)) / 60);
                break;
            case 'min':
                this.minutesPointer.style.transform = `rotate(${90 + (value % 60) * 6}deg)`;
                if (value > 60) this.calculateRotation('hour',(value - (value % 60)) / 60);
                break;
            case 'hour':
                this.hoursPointer.style.transform = `rotate(${90 + (value % 24) * 30}deg)`;
                break;
            default:
                return;
        }
    }

    private initializeClock() {
        this.calculateRotation('sec', 0);
        this.calculateRotation('min', 0);
        this.calculateRotation('hour', 0);
    };

    private init() {
        this.initializeClock();
        this.createTimers();
    }


    componentDidLoad() {
        this.selectHtmlElements();
        this.initialiseUserInteractionStreams();

        this.pauseValue$.pipe(
            takeUntil(this.destroy$),
            filter(v => v === 0)
        ).subscribe(this.init.bind(this));

        this.stop$.pipe(
            takeUntil(this.destroy$),
            withLatestFrom(this.currentSeconds$)
        ).subscribe(([_, currentSeconds]) => {
            this.stopClock.emit(currentSeconds);
            this.pauseValue$.next(0);
            this.cancel$.next(true);
        })
    }

    componentDidUnload() {
        this.destroy$.next();
    }

    render() {
        return <div id="clock">
            <div class="clock-body">
                <div class="clock-plate"></div>
                <div class="millisecond-pointer"></div>
                <div class="minute-markers">
                    {this.minutesArray.map(_ => <span></span>)}
                </div>
                <div class="five-minute-markers">
                    {this.fiveMinutesArray.map(_ => <span></span>)}
                </div>
                <div class="fifteen-minute-markers">
                    {this.fifteenMinutesArray.map(_ => <span></span>)}
                </div>
                <div class="clock-decoration">
                    <div class="left"></div>
                    <div class="right"></div>
                </div>
                <div class="pointer-group">
                    <div class="seconds-pointer"></div>
                    <div class="minutes-pointer"></div>
                    <div class="hours-pointer"></div>
                </div>
            </div>
            <div class="controls">
                <button class="start-button">start</button>
                <button class="take-button">take</button>
                <button class="pause-button">pause</button>
                <button class="stop-button">stop</button>
            </div>

        </div>
    }
}

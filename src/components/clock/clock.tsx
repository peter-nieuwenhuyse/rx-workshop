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
    private startButton;
    private stopButton;
    private takeButton;
    private pauseButton;
    private start$;
    private take$;
    private pause$;
    private stop$;
    private interval$;
    private currentSeconds$;
    private pauseValue$: BehaviorSubject<number> = new BehaviorSubject<number>(0);
    private cancel$: Subject<boolean> = new Subject<boolean>();
    private destroy$: Subject<boolean> = new Subject<boolean>();

    private selectHtmlElements() {
        const root = this.element.shadowRoot;
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
        this.listenToStart();
        this.initializePauseOrTake()
    }

    private listenToStart() {
        this.currentSeconds$ = this.start$.pipe(
            take(1),
            switchMap(_ => this.interval$.pipe(
                withLatestFrom(this.pauseValue$),
                map(([currentSeconds, pauseValue]) => (currentSeconds + pauseValue)),
                takeUntil(this.cancel$),
            )),
            shareReplay(1)
        );
        this.currentSeconds$.subscribe(this.calculateRotation.bind(this));
    }

    private initializePauseOrTake() {
        combineLatest([this.take$, this.pause$]).pipe(
            takeUntil(this.cancel$),
            filter(([a, b]) => (a !== 0 || b !== 0)),
            withLatestFrom(this.currentSeconds$)
        ).subscribe(this.handleStopOrPauseClick.bind(this));
    }

    private handleStopOrPauseClick(clickEvent) {
        clickEvent[0][1] ! == 0 ? this.handleTakeClick(clickEvent[1]) : this.handlePauseClick(clickEvent[1]);
    }

    private handleTakeClick(lapTime: number) {
        console.log(lapTime);
        this.takeTime.emit(lapTime);
    }

    private handlePauseClick(currentTime) {
        this.pauseValue$.next(currentTime);
        this.cancel$.next(true);
        this.createTimers();
    }

    private handleStopClick(val) {
        this.stopClock.emit(val[1]);
        this.pauseValue$.next(0);
        this.cancel$.next(true);
        this.createTimers();
    }

    private calculateRotation(value) {
        this.setStyle('--seconds', (value % 60) * 6);
        (value > 60 || value === 0) && this.setStyle('--minutes', (Math.floor(value / 60) * 6));
        (value > 3600 || value == 0) && this.setStyle('--hours', Math.floor(value / 3600) * 30);
    }

    private setStyle(prop, value) {
        const baseRotation = 90;
        this.element.style.setProperty(`${prop}`, `${baseRotation + value}deg`)
    }

    private init() {
        this.calculateRotation(0);
        this.createTimers();
    }

    private listenToStop() {
        this.stop$.pipe(
            takeUntil(this.destroy$),
            withLatestFrom(this.currentSeconds$)
        ).subscribe(this.handleStopClick.bind(this));
    }

    private listenToPause() {
        this.pauseValue$.pipe(
            takeUntil(this.destroy$),
            filter(v => v === 0)
        ).subscribe(this.init.bind(this));
    }

    componentDidLoad() {
        this.selectHtmlElements();
        this.initialiseUserInteractionStreams();
        this.listenToPause();
        this.listenToStop();
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

"use client";

import { AppProgressProvider as ProgressBar } from '@bprogress/next';

const ProgressBarProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <ProgressBar
            height="4px"
            color="var(--primary)"
            options={{ showSpinner: false, easing: 'ease', speed: 500 }}
            shallowRouting={false}
        >{children}</ProgressBar>
    );
};

export default ProgressBarProvider;

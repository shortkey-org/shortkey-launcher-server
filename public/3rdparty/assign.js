class AssignFlow {

    assignHost = "https://assignkey.com";
    popupSessionEndpoint = "https://assignkey.com/api/client/session?sess_type=PopupSession"

    appId = null;
    appSecret = null;
    origins = [];

    initiatedSession = {
        status: false,
        secret: null,
        sessionStatus: null,
        accessToken: null
    }

    constructor(clientId, clientSecretToken) {
        this.appId = clientId;
        this.appSecret = clientSecretToken;
    }

    async getDeviceInfo() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const locale = navigator.language;
        // const ipPromise = fetch('https://api.ipify.org?format=json').then((res) => res.json());
        const locationPromise = fetch('https://ipapi.co/json/').then((res) => res.json());
        const device = {
            type: '',
            vendor: '',
            model: '',
        };
        const browser = {
            name: '',
            version: '',
        };
        const os = {
            name: '',
            version: '',
        };
        const ua = navigator.userAgent;

        // Parse User-Agent string to get device, browser and OS information
        if (/iPad|iPhone|iPod/.test(ua)) {
            device.type = 'mobile';
            device.vendor = 'Apple';
            const match = ua.match(/OS\s([\d_]+)/);
            device.model = match[1].replace(/_/g, '.');
            browser.name = 'Safari';
            browser.version = ua.match(/Version\/([\d\.]+)/)[1];
            os.name = 'iOS';
            os.version = match[1].split('_')[0];
        } else if (/Android/.test(ua)) {
            device.type = 'mobile';
            device.vendor = 'Google';
            const match = ua.match(/Android\s([\d\.]+)/);
            device.model = match[1];
            browser.name = 'Chrome';
            browser.version = ua.match(/Chrome\/([\d\.]+)/)[1];
            os.name = 'Android';
            os.version = match[1];
        } else if (/Windows Phone/.test(ua)) {
            device.type = 'mobile';
            device.vendor = 'Microsoft';
            browser.name = 'Internet Explorer';
            const match = ua.match(/Windows Phone (?:OS )?([\d\.]+)/);
            device.model = match[1];
            os.name = 'Windows Phone';
            os.version = match[1];
        } else if (/Windows NT/.test(ua)) {
            device.type = 'desktop';
            device.vendor = 'Microsoft';
            browser.name = 'Internet Explorer';
            const match = ua.match(/Windows NT ([\d\.]+)/);
            os.name = 'Windows';
            os.version = match[1];
        } else if (/Mac OS X/.test(ua)) {
            device.type = 'desktop';
            device.vendor = 'Apple';
            const match = ua.match(/Mac OS X\s([\d_]+)/);
            device.model = match[1].replace(/_/g, '.');
            browser.name = 'Safari';
            browser.version = ua.match(/Version\/([\d\.]+)/)[1];
            os.name = 'Mac OS X';
            os.version = match[1].split('_')[0];
        } else if (/Linux/.test(ua)) {
            device.type = 'desktop';
            device.vendor = 'Linux';
            browser.name = 'Chrome';
            browser.version = ua.match(/Chrome\/([\d\.]+)/)[1];
            os.name = 'Linux';
        }

        // Wait for IP and location information to be fetched, then create the JSON object
        // return await Promise.all([ipPromise, locationPromise]).then(([ipData, locationData]) => {
        //     const info = {
        //         device,
        //         browser,
        //         os,
        //         localtime: new Date().toLocaleString(),
        //         timezone,
        //         locale,
        //         location: locationData,
        //         ip: ipData.ip,
        //     };
        //     return info;
        // });
        return await Promise.all([locationPromise]).then(([locationData]) => {
            const info = {
                device,
                browser,
                os,
                localtime: new Date().toLocaleString(),
                timezone,
                locale,
                location: locationData,
                ip: locationData.ip,
            };
            return info;
        });
    }

    async recieveMessage(event) {
        if(event.origin !== this.assignHost) return;

        console.log(event.data);

        this.initiatedSession = {
            status: true,
            secret: event.data['sess_secret'],
            sessionStatus: event.data['sess_status'],
            accessToken: event.data['access_token']
        }

        /** Save in cookies. */

    }

    async initializePopupFlow(successCallback, failedCallback) {

        window.addEventListener("message", this.recieveMessage, false);

        let device_info = await this.getDeviceInfo();

        let response = await fetch(this.popupSessionEndpoint, {
            method: 'POST',
            headers: {
                ['X-Assign-App-ID']: this.appId,
                ['X-Assign-App-Secret']: this.appSecret
            },
            body: JSON.stringify({
                extra: JSON.stringify(device_info)
            })
        });

        response = await response.json();


        /** Popup */

        const width = 500;
        const height = 600;
        
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        var popup = null;
    
        let interval = setInterval(() => {
            popup = window.open(response.session['url'], 'SignIn to Shortkey', `width=${width},height=${height},left=${left},top=${top}`);
            if(popup && !popup.closed) {

                popup.addEventListener('load', () => {
                    console.log("Loaded")
                    const xhr = new XMLHttpRequest();
                    xhr.open("GET", response.session['url']);
                    xhr.setRequestHeader("X-Assign-App-ID", creds.id);
                    xhr.setRequestHeader("X-Assign-App-Secret", creds.secret[0].token);
                    xhr.send();
                });

                const checkPopupClosed = setInterval(() => {
                    if (!popup || popup.closed || popup.closed === undefined) {
                        clearInterval(checkPopupClosed);

                        let url = new URL(response.session['url']);

                        fetch(`https://assignkey.com/api/client/session?sess_id=${url.searchParams.get('sess_id')}`, {
                            headers: {
                                ['X-Assign-App-ID']: this.appId,
                                ['X-Assign-App-Secret']: this.appSecret
                            },
                        }).then(async (resp) => {

                            let r = await resp.json();

                            // window.alert(`Ter: ${JSON.stringify(r)}`);
                            successCallback(r.session.id, r.session.accountId, r.access_token);

                            /** response: 
                            
                                {
                                    "session": {
                                        "id": "ID",
                                        "secret": "XXXXXXXXX",
                                        "status": "Success",
                                        "cllientId": "CLIENT_ID",
                                        "accountId": "ACCOUNT_ID",
                                        "type": "PopupSession",
                                    },
                                    "accessToken": "XXXX"
                                }

                            */

                            // save access token in cookies., save accountId in backend onlyy
                            /** Redirect to frontend with cookie. */

                        })

                        // window.alert(`Popup closed: ${JSON.stringify(this.initiatedSession)}`)
                    }
                }, 500);

                clearInterval(interval);
            }
        }, 400);

    }

}

let assignFlowInitiated = null;

async function initAssignFlow(clientId, secret, successCallback, failedCallback) {
    assignFlowInitiated = new AssignFlow(clientId, secret);
    await assignFlowInitiated.initializePopupFlow(successCallback, failedCallback);
}